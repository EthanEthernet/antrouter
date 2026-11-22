# Loads the repo as an unpacked Chrome extension in Playwright's Chromium and checks the popup.
# Run:  python tests/qa/extension-qa.py [screenshot folder]
import sys, os, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SH = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='antrouter-qa-')
os.makedirs(SH, exist_ok=True)
def out(*a): print(*[str(x).encode('ascii', 'replace').decode() for x in a], flush=True)
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(tempfile.mkdtemp(), headless=True, channel='chromium',
        args=[f'--disable-extensions-except={ROOT}', f'--load-extension={ROOT}'], viewport={'width': 780, 'height': 580})
    pg = ctx.new_page(); pg.goto('chrome://extensions'); pg.wait_for_timeout(1500)
    info = pg.evaluate("new Promise(r=>chrome.developerPrivate.getExtensionsInfo(x=>r(x.map(e=>({id:e.id,name:e.name,version:e.version,errs:(e.manifestErrors||[]).length+(e.runtimeErrors||[]).length})))))")
    out('Installed:', info)
    ext = [e for e in info if e['name'] == 'AntRouter']
    if not ext: out('FAIL extension did not load'); sys.exit(1)
    eid = ext[0]['id']
    errs = []
    pop = ctx.new_page(); pop.on('pageerror', lambda e: errs.append(str(e))); pop.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pop.set_viewport_size({'width': 780, 'height': 580})
    pop.goto(f'chrome-extension://{eid}/index.html?popup'); pop.wait_for_timeout(800)
    out('PASS popup opens' if pop.locator('#prompt').is_visible() else 'FAIL popup', '| title screen hidden:', not pop.is_visible('#launch'))
    pop.fill('#prompt', 'Fix this off-by-one bug in my Python loop'); pop.click('#go'); pop.wait_for_timeout(4500)
    out('Popup route ->', pop.inner_text('#result h3'))
    box = pop.locator('#good').bounding_box()
    out('PASS' if 0 <= box['y'] and box['y'] + box['height'] <= 580 else 'FAIL', 'Good route visible in the popup | spans y=%d..%d of 580' % (box['y'], box['y'] + box['height']))
    pop.click('#good'); pop.wait_for_timeout(600)
    pop.reload(); pop.wait_for_timeout(800)
    out('Header after reopen (progress persists):', pop.inner_text('#hdrStats'))
    pop.screenshot(path=os.path.join(SH, '11-extension-popup.png'))
    out('Music file status:', pop.evaluate("fetch('Carefree.mp3').then(r=>r.status).catch(e=>String(e))"))
    out('Content Security Policy errors:', [e for e in errs if 'Content Security Policy' in e or 'Refused' in e] or 'none', '| all errors:', errs or 'none')
    ctx.close()
