# End-to-end browser QA for AntRouter (Beta QA pass, Nov 22, 2026).
# Needs Python Playwright with Chromium:  pip install playwright && python -m playwright install chromium
# Run from anywhere:  python tests/qa/browser-qa.py [screenshot folder]
# Serves the repo on a local port, drives Chromium at laptop, popup and phone sizes, and prints PASS / FAIL / INFO.
import sys, os, json, re, tempfile, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SH = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='antrouter-qa-')
os.makedirs(SH, exist_ok=True)
print('Screenshots:', SH)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT))
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{port}/index.html'
R = []

def rec(name, ok, detail=''):
    st = 'INFO' if ok is None else ('PASS' if ok else 'FAIL')
    detail = str(detail).encode('ascii', 'replace').decode()
    R.append((st, name, detail)); print(st, name, '|', detail, flush=True)

def new(b, vw=(1280, 800), url=URL, scheme='light'):
    ctx = b.new_context(viewport={'width': vw[0], 'height': vw[1]}, color_scheme=scheme)
    pg = ctx.new_page(); errs = []; bad = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.on('requestfailed', lambda r: bad.append(r.url))
    pg.on('response', lambda r: r.status >= 400 and bad.append(f'{r.status} {r.url}'))
    pg.goto(url); pg.wait_for_timeout(400)
    return ctx, pg, errs, bad

def start(pg):
    pg.click('#launchStart'); pg.wait_for_timeout(700)

def route(pg, text, wait=4500):
    pg.fill('#prompt', text); pg.click('#go'); pg.wait_for_timeout(wait)

def safe(name, fn):
    try: fn()
    except Exception as e: rec(name + ' (script error)', False, str(e).splitlines()[0])

with sync_playwright() as p:
    b = p.chromium.launch()

    def desktop():
        ctx, pg, errs, bad = new(b)
        rec('Title screen shows on cold load', pg.is_visible('#launch'), pg.inner_text('#launchSave'))
        rec('Start is focused by default', pg.evaluate("document.activeElement.id") == 'launchStart')
        pg.screenshot(path=os.path.join(SH, '01-title.png'))
        start(pg)
        rec('Start closes title', not pg.is_visible('#launch'))
        rec('Focus moves to prompt after Start', pg.evaluate("document.activeElement.id") == 'prompt',
            'focused: ' + pg.evaluate("document.activeElement.id||document.activeElement.tagName"))
        samples = pg.eval_on_selector_all('#samples button', 'e=>e.map(x=>x.textContent)')
        for i, s in enumerate(samples):
            pg.click(f'#samples button:nth-child({i+1})'); pg.wait_for_timeout(4500)
            h = pg.inner_text('#result h3'); rec(f'Sample {i+1} routes', bool(h), f'{s[:40]} -> {h}')
        pg.screenshot(path=os.path.join(SH, '02-after-samples.png'), full_page=True)
        pg.fill('#prompt', 'What is 2+2?'); pg.click('#go')
        pg.fill('#prompt', 'Write a haiku about rain'); pg.click('#go'); pg.wait_for_timeout(300)
        rec('Route button says Mandu is busy during the animation', pg.is_disabled('#go') and 'eating' in pg.inner_text('#go'), 'button: "' + pg.inner_text('#go') + '", disabled: ' + str(pg.is_disabled('#go')))
        pg.wait_for_timeout(4500)
        route(pg, 'Fix this off-by-one bug in my Python loop')
        for _ in range(4):
            pg.click('#result .chip[data-id="gflash"]'); pg.wait_for_timeout(1500)
            route(pg, 'Fix this off-by-one bug in my Python loop')
        name = pg.inner_text('#result h3').strip(); reason = pg.inner_text('#result .reason')
        others = [m for m in ['Claude Opus', 'Claude Sonnet', 'Claude Haiku', 'GPT flagship', 'GPT mini', 'Gemini Pro', 'Gemini Flash'] if m != name and m in reason]
        rec('Pick and reason name the same model after reroutes', not others, f'card="{name}" reason="{reason}"')
        pg.screenshot(path=os.path.join(SH, '03-after-reroutes.png'))
        route(pg, 'hey, should i take a gap year?')
        chips = pg.eval_on_selector_all('#result .chip:not(.on)', 'e=>e.map(x=>x.dataset.id)')
        pg.click(f'#result .chip[data-id="{chips[0]}"]'); pg.wait_for_timeout(800)
        t = pg.inner_text('#result .reason'); rec('Reroute message grammar', ' a everyday' not in t, t)
        pg.fill('#prompt', ''); pg.click('#go'); pg.wait_for_timeout(2500)
        rec('Empty prompt right after a reroute keeps its guidance', 'Type a prompt' in pg.inner_text('#result'), pg.inner_text('#result')[:70].replace('\n', ' '))
        route(pg, '<img src=x onerror="window.__x=1">What is the capital of France?')
        rec('HTML in prompt is escaped', pg.evaluate('window.__x') != 1)
        route(pg, "What's the capital of Australia?")
        rec('Open-in link', None, pg.get_attribute('#openLink', 'href'))
        body = pg.inner_text('body').lower()
        ok = 'on your computer' in body
        rec('Privacy note: routing is local / Open-in sends the prompt', ok, '' if ok else 'no such line on the main screen')
        pg.click('#endBtn'); pg.wait_for_timeout(500); before = pg.inner_text('#recap'); pg.click('#exitResume')
        pg.reload(); pg.wait_for_timeout(500); start(pg); pg.click('#endBtn'); pg.wait_for_timeout(500); after = pg.inner_text('#recap')
        rb = re.search(r'Prompts routed\s*(\d+)', before).group(1); ra = re.search(r'Prompts routed\s*(\d+)', after).group(1)
        rec('Session recap survives a reload', ra == rb, f'before reload {rb} routed, after reload {ra}')
        pg.click('#exitResume')
        rec('Level after this run', None, pg.inner_text('#hdrStats'))
        pg.click('#settingsBtn'); pg.click('#saveCopy'); code = pg.input_value('#saveCode')
        pg.fill('#saveCode', 'garbage'); pg.click('#saveLoad'); rec('Bad save code refused', "isn't" in pg.inner_text('#saveNote'))
        pg.fill('#saveCode', code); pg.click('#saveLoad'); rec('Good save code loads', 'Save loaded' in pg.inner_text('#saveNote'), pg.inner_text('#saveNote'))
        pg.keyboard.press('Escape')
        rec('No JS errors (desktop run)', not errs, '; '.join(errs[:5]))
        rec('No failed requests (desktop run)', not bad, '; '.join(bad[:5]))
        ctx.close()
    safe('Desktop run', desktop)

    def fold():
        for label, vw, url in [('laptop 1366x768', (1366, 768), URL), ('popup 780x580', (780, 580), URL + '?popup')]:
            ctx, pg, errs, bad = new(b, vw, url)
            if pg.is_visible('#launch'): start(pg)
            route(pg, 'Fix this off-by-one bug in my Python loop')
            box = pg.locator('#good').bounding_box(); bottom = round(box['y'] + box['height'])
            rec(f'Good route visible without scrolling ({label})', 0 <= box['y'] and bottom <= vw[1], f'Good route spans y={round(box["y"])}..{bottom}, viewport height {vw[1]}')
            pg.screenshot(path=os.path.join(SH, f'05-fold-{vw[0]}.png'))
            rec(f'No sideways scroll ({label})', not pg.evaluate('document.documentElement.scrollWidth>innerWidth'))
            rec(f'No JS errors ({label})', not errs, '; '.join(errs[:3]))
            ctx.close()
    safe('Fold', fold)

    def mobile():
        ctx, pg, errs, bad = new(b, (375, 812))
        start(pg); route(pg, "What's the capital of Australia?")
        rec('No sideways scroll (375px)', not pg.evaluate('document.documentElement.scrollWidth>innerWidth'))
        clipped = pg.evaluate("(()=>{const t=document.querySelector('.tabs');return t.scrollWidth>t.clientWidth+1})()")
        lt = pg.locator('#tab-about').bounding_box()
        rec('Tab bar fits at 375px', not clipped and lt['x'] + lt['width'] <= 375, f'tabs overflow={clipped}, About tab right edge={round(lt["x"]+lt["width"])}px')
        pg.screenshot(path=os.path.join(SH, '06-mobile.png')); ctx.close()
    safe('Mobile', mobile)

    def theme():
        ctx, pg, *_ = new(b, scheme='dark'); bg = pg.evaluate("getComputedStyle(document.body).backgroundColor"); ctx.close()
        ctx, pg, *_ = new(b, scheme='light'); bgl = pg.evaluate("getComputedStyle(document.body).backgroundColor"); ctx.close()
        rec('System theme follows OS dark mode', bg != bgl, f'OS light -> {bgl}, OS dark -> {bg}')
    safe('Theme', theme)

    def keyboard_tour():
        # A keyboard player types, presses Ctrl+Enter, then Tabs from wherever focus lands.
        ctx, pg, errs, bad = new(b); start(pg)
        pg.focus('#prompt'); pg.keyboard.type('Fix this off-by-one bug in my Python loop'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(4500)
        n = 0
        while n < 80 and pg.evaluate('document.activeElement.id') != 'good':
            pg.keyboard.press('Tab'); n += 1
        rec('Keyboard: Tab presses from Ctrl+Enter to Good route', n <= 15, f'{n} presses')
        pg.focus('#good'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        rec('Focus kept after Good route', pg.evaluate('document.activeElement.tagName') != 'BODY', 'focus on: ' + pg.evaluate('document.activeElement.id||document.activeElement.tagName'))
        lvl = pg.inner_text('#hdrStats'); pg.click('#tourBtn'); pg.wait_for_timeout(7000); pg.click('#tourStop'); pg.wait_for_timeout(1500)
        rec('Tour Stop restores the save', pg.inner_text('#hdrStats') == lvl, f'before "{lvl}" after "{pg.inner_text("#hdrStats")}"')
        rec('Tour Stop clears the tour prompt', pg.input_value('#prompt') == '', 'box: "' + pg.input_value('#prompt') + '"')
        pg.click('#tourBtn'); pg.wait_for_timeout(1000); pg.click('#tourPause'); c1 = pg.inner_text('#tourCap')
        pg.click('#tourNext'); pg.wait_for_timeout(1500); c2 = pg.inner_text('#tourCap')
        rec('Tour Next advances while paused', c1 != c2, f'caption stayed: "{c1[:60]}"' if c1 == c2 else '')
        pg.click('#tourStop'); pg.wait_for_timeout(1500)
        pg.click('#tourBtn'); pg.wait_for_timeout(72000)
        rec('Full tour runs to the end', 'on' not in (pg.get_attribute('#tourbar', 'class') or ''))
        rec('Save intact after full tour', pg.inner_text('#hdrStats') == lvl, pg.inner_text('#hdrStats'))
        rec('No JS errors during keyboard + tour', not errs, '; '.join(errs[:3]))
        ctx.close()
    safe('Keyboard/tour', keyboard_tour)

    def misc():
        ctx, pg, errs, bad = new(b); start(pg); route(pg, "What's the capital of Australia?")
        old = pg.inner_text('#result h3')
        pg.click('#plat button:has-text("ChatGPT")'); pg.wait_for_timeout(300)
        rec('Switching app clears or updates the old pick', 'GPT' in pg.inner_text('#result h3') if pg.locator('#result h3').count() else True, pg.inner_text('#result')[:80].replace('\n', ' '))
        # With the player's own text in the box, a sample replaces it without routing, and Ctrl+Z brings it back.
        pg.click('#prompt'); pg.keyboard.press('Control+a'); pg.keyboard.press('Delete'); pg.keyboard.type('my own half-written prompt')
        before = pg.inner_text('#bellySplit'); pg.click('#samples button:nth-child(1)'); pg.wait_for_timeout(300)
        loaded = pg.input_value('#prompt'); routed = pg.inner_text('#bellySplit') != before
        pg.focus('#prompt'); pg.keyboard.press('Control+z'); pg.wait_for_timeout(200); undone = pg.input_value('#prompt')
        rec('Sample tap over typed text waits for Route, and undo restores the text', not routed and loaded != 'my own half-written prompt' and 'half-written' in undone,
            f'routed: {routed}, after tap: "{loaded[:40]}", after Ctrl+Z: "{undone}"')
        pg.wait_for_timeout(4500)
        pg.click('#tab-progress'); pg.wait_for_timeout(200)
        rec('Badge names', None, pg.inner_text('#badges').replace('\n', ' '))
        pg.goto(f'http://127.0.0.1:{port}/extension.html'); pg.wait_for_timeout(2000)
        vids = pg.eval_on_selector_all('video', 'v=>v.map(x=>({src:x.currentSrc.split("/").pop(),ready:x.readyState,err:x.error&&x.error.code}))')
        rec('extension.html video loads', bool(vids) and all(v['ready'] >= 1 and not v['err'] for v in vids), json.dumps(vids))
        rec('No failed requests (main + extension page)', not bad, '; '.join(bad[:5]))
        ctx.close()
        ctx = b.new_context(); pg = ctx.new_page(); e2 = []; pg.on('pageerror', lambda e: e2.append(str(e)))
        pg.goto('file:///' + ROOT.replace('\\', '/') + '/index.html'); pg.wait_for_timeout(500); start(pg); route(pg, 'hello there', 5000)
        rec('Runs from file:// (double-click)', bool(pg.inner_text('#result h3')) and not e2, '; '.join(e2)); ctx.close()
    safe('Misc', misc)
    b.close()
json.dump(R, open(os.path.join(SH, 'browser_results.json'), 'w'), indent=1)
print(f"\n{sum(r[0] == 'PASS' for r in R)} pass, {sum(r[0] == 'FAIL' for r in R)} fail, {sum(r[0] == 'INFO' for r in R)} info")
