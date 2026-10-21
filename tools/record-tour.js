// Records the built-in 1-minute guided tour of the AntRouter prototype to video.
// Usage:  npm i playwright && npx playwright install chromium
//         node tools/record-tour.js            -> writes media/tour-<timestamp>.webm
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const page = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    colorScheme: 'dark',
    recordVideo: { dir: path.resolve(__dirname, '..', 'media'), size: { width: 1280, height: 1000 } },
  });
  const p = await ctx.newPage();
  await p.goto(page);
  await p.waitForTimeout(1500);
  await p.click('#tourBtn');            // starts the sandboxed tour
  await p.waitForTimeout(64000);        // tour runs ~60 s, then reloads the page
  await ctx.close();                    // finalizes the video file
  await browser.close();
  console.log('Saved recording to media/');
})();
