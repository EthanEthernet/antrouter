"""Records a captioned demo of the AntRouter Chrome extension popup (loaded unpacked in Chromium).
Usage: python -I tools/record-extension-demo.py <extension_folder> <out_dir>
Captions are drawn by this script on top of the page for the recording only; the extension itself is unchanged."""
import sys, tempfile, time
from playwright.sync_api import sync_playwright

EXT, OUT = sys.argv[1], sys.argv[2]
W, H = 780, 580   # the popup's real size (manifest popup, css html.popup)
CAPTION_JS = """t => { let c = document.getElementById('__demo_cap');
  if (!c) { c = document.createElement('div'); c.id = '__demo_cap';
    c.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483647;max-width:92%;' +
      'background:rgba(11,17,32,.92);color:#fff;border:1px solid #F5B82E;border-radius:12px;padding:9px 14px;' +
      'font:600 15px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.45);pointer-events:none';
    document.body.appendChild(c) }
  c.textContent = t; c.style.display = t ? 'block' : 'none' }"""
POINTER_JS = """sel => { const e = document.querySelector(sel); if (!e) return; e.scrollIntoView({block:'center'});
  e.style.outline = '3px solid #F5B82E'; e.style.outlineOffset = '3px'; setTimeout(() => { e.style.outline = ''; }, 1600) }"""

prof = tempfile.mkdtemp(prefix='antrouter-demo-')
with sync_playwright() as pw:
    ctx = pw.chromium.launch_persistent_context(prof, channel='chromium', headless=True,
        args=[f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'],
        viewport={'width': W, 'height': H}, record_video_dir=OUT, record_video_size={'width': W, 'height': H})
    ctx.route('**/*', lambda r: r.abort() if any(h in r.request.url for h in ['claude.ai', 'chatgpt.com', 'gemini.google.com']) else r.continue_())
    tmp = ctx.new_page(); tmp.goto('chrome://extensions'); time.sleep(1)
    eid = [e for e in tmp.evaluate("new Promise(r => chrome.developerPrivate.getExtensionsInfo(r))") if e['name'] == 'AntRouter'][0]['id']
    tmp.close()
    p = ctx.pages[0] if ctx.pages else ctx.new_page()
    for extra in ctx.pages:
        if extra is not p: extra.close()
    p.goto(f'chrome-extension://{eid}/index.html?popup', wait_until='domcontentloaded'); p.wait_for_timeout(1500)
    cap = lambda t, ms=0: (p.evaluate(CAPTION_JS, t), p.wait_for_timeout(ms))
    point = lambda sel: p.evaluate(POINTER_JS, sel)

    cap('Click the AntRouter icon in Chrome’s toolbar: Mandu opens in a popup.', 3200)
    point('#plat'); cap('1. Pick the app you’re working in (here: Claude).', 1200)
    p.click('#plat button:has-text("Claude")'); p.wait_for_timeout(900)
    cap('2. Type your prompt, then press Route prompt (or Ctrl+Enter).', 300)
    p.click('#prompt'); p.keyboard.type('CRITICAL: You MUST explain why my Python loop never ends.', delay=28); p.wait_for_timeout(500)
    point('#go'); p.wait_for_timeout(500); p.click('#go')
    cap('3. Mandu follows the trail and swallows an ant in the model’s color…', 3600)
    point('#result .sure'); cap('…then says which model, why, and how sure he is.', 3600)
    p.evaluate("document.querySelector('#result details.adapt').scrollIntoView({block:'center'})")
    point('#result details.adapt summary'); cap('4. The prompt adapter suggests tweaks for that model.', 1800)
    p.click('#result details.adapt summary'); p.wait_for_timeout(400)
    cap('Each change shows why, plus a diff. Your original is sent unless you choose.', 3800)
    point('#useAdapted'); p.wait_for_timeout(500); p.click('#useAdapted')
    cap('“Use suggested prompt” switches what gets sent.', 2600)
    point('#openLink'); cap('5. “Open in Claude” opens a new tab with the prompt filled in.', 3200)
    p.evaluate("document.querySelector('#result .chips').scrollIntoView({block:'center'})")
    point('#result .chip[data-id="opus"]'); cap('Disagree with the pick? Tap another model to reroute.', 1600)
    p.click('#result .chip[data-id="opus"]'); p.wait_for_timeout(600)
    cap('Mandu tilts his head and learns that trail for next time.', 3600)
    p.click('#tab-trails'); p.wait_for_timeout(300)
    p.evaluate("window.scrollTo(0, document.getElementById('panel-trails').getBoundingClientRect().top + scrollY - 60)")
    cap('6. The Trails tab shows what he learned and how you used the adapter.', 3400)
    p.click('#tab-progress'); p.wait_for_timeout(300)
    p.evaluate("window.scrollTo(0, document.getElementById('panel-progress').getBoundingClientRect().top + scrollY - 60)")
    cap('Progress: decisions earn XP; each level unlocks a routing tool.', 3200)
    p.evaluate("window.scrollTo(0,0)"); p.wait_for_timeout(300)
    point('#settingsBtn'); cap('7. Settings: Calm mode, volume, and a save code to move progress.', 1500)
    p.click('#settingsBtn'); p.wait_for_timeout(500)
    p.click('#saveCopy'); p.wait_for_timeout(300)
    cap('Copy the save code here and paste it on the website (or the other way around).', 3800)
    p.keyboard.press('Escape'); p.wait_for_timeout(300)
    cap('That’s it: route, steer, and let Mandu learn. Full guide on this page.', 3000)
    cap('', 400)
    video = p.video
    ctx.close()
    print('VIDEO', video.path())
