"""Captures pitch screenshots of AntRouter. Usage: python -I tools/capture-pitch-screenshots.py <base_url> <out_dir>"""
import json, sys
from playwright.sync_api import sync_playwright
BASE, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
ARTICLE = ('Ant colony optimization was introduced by Marco Dorigo in 1992. Artificial ants leave pheromone trails on '
           'good paths, and later ants prefer stronger trails, so the colony converges on short routes. ') * 3

def route(p, text, plat='Any app', wait=3500):
    p.click(f'#plat button:has-text("{plat}")'); p.fill('#prompt', text); p.click('#go'); p.wait_for_timeout(wait)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # 1. title screen
    ctx = b.new_context(viewport={'width': 1280, 'height': 860}, device_scale_factor=2, color_scheme='light'); p = ctx.new_page()
    p.goto(BASE + '/index.html'); p.wait_for_timeout(1500)
    p.locator('#launch .screen-card').screenshot(path=f'{OUT}/01-title-screen.png')
    p.click('#launchStart'); p.wait_for_timeout(700)
    # 2. full game view after a route (seeded a little progress so the belly and HUD look lived-in)
    p.evaluate("""() => { localStorage.setItem('antrouter:prog', JSON.stringify({xp: 130, crumbs: 34, owned: ['hat','bow'], worn: {hat: true, bow: true}, badges: ['first','good','reroute','tri'], fams: ['Claude','GPT','Gemini'], routes: 11, laps: 6, qdone: 4}));
      localStorage.setItem('antrouter:belly', JSON.stringify({Claude: 5, GPT: 3, Gemini: 3})); }""")
    p.reload(); p.wait_for_timeout(800); p.click('#launchStart'); p.wait_for_timeout(700)
    route(p, 'CRITICAL: You MUST explain why my Python loop never ends.', 'Claude')
    p.click('#result details.adapt summary'); p.wait_for_timeout(300)
    p.evaluate('window.scrollTo(0,0)'); p.wait_for_timeout(200)
    p.screenshot(path=f'{OUT}/02-game-view.png', full_page=False)
    p.locator('#result').screenshot(path=f'{OUT}/03-pick-and-adapter.png')
    # 3. progress with unlocks
    p.click('#tab-progress'); p.wait_for_timeout(300)
    p.locator('#panel-progress .card').first.screenshot(path=f'{OUT}/04-progress-unlocks.png')
    # 4. Mandu close-up in the terminal
    p.click('#tab-route'); route(p, 'Summarize the main points:\n\n' + ARTICLE, 'Any app', 2200)
    p.locator('#term').screenshot(path=f'{OUT}/05-mandu-snatch.png')
    ctx.close()
    # 5. extension popup
    ctx = b.new_context(viewport={'width': 780, 'height': 580}, device_scale_factor=2); p = ctx.new_page()
    p.goto(BASE + '/index.html?popup'); p.wait_for_timeout(800)
    route(p, 'Compare fixed vs floating exchange rates for an emerging market, step by step', 'ChatGPT', 3600)
    p.screenshot(path=f'{OUT}/06-extension-popup.png')
    ctx.close()
    # 6. dark theme
    ctx = b.new_context(viewport={'width': 1280, 'height': 860}, device_scale_factor=2, color_scheme='dark'); p = ctx.new_page()
    p.goto(BASE + '/index.html'); p.wait_for_timeout(800); p.click('#launchStart'); p.wait_for_timeout(600)
    route(p, 'why is my Python loop slow', 'Any app', 3500)
    p.screenshot(path=f'{OUT}/07-dark-theme.png')
    ctx.close(); b.close()
print('done')
