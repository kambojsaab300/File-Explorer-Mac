// Usage: node tools/shoot.js <html-file> <out.png> [width] [height] [hash] [fullPage]
// Renders a local HTML file with the pre-installed Playwright Chromium.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const [file, out, w = '1440', h = '900', hash = '', full = '0'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  const url = 'file://' + path.resolve(file) + (hash ? '#' + hash : '');
  await page.goto(url);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out, fullPage: full === '1' });
  await browser.close();
  console.log('saved', out);
})();
