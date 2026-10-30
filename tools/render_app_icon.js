// Renders icons/app-icon/khoj-app-icon.svg to a transparent 1024px PNG.
// Then run: python3 tools/make_icns.py
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const svg = fs.readFileSync(path.join(root, 'icons/app-icon/khoj-app-icon.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const el = await page.$('svg');
  await el.screenshot({ path: path.join(root, 'icons/app-icon/khoj-1024.png'), omitBackground: true });
  await browser.close();
  console.log('rendered khoj-1024.png');
})();
