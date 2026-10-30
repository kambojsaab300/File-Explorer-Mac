// Loads the prototype with several deep-link states and reports any JS errors.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = 'file://' + path.resolve(__dirname, '../design/prototype/index.html');
  const states = process.argv.slice(2).length ? process.argv.slice(2) : [
    '', 'loc=/Volumes/MyDATA&view=content', 'loc=/Volumes/MyDATA&view=details&sel=UI Issues.docx&details=1', 'loc=home', 'loc=gallery',
    'loc=/Volumes/MyDATA&sel=Dev&ctx=item', 'loc=/Volumes/MyDATA&ctx=bg', 'menu=view', 'dialog=onboarding', 'dialog=settings', 'dialog=conflict', 'dialog=copy',
    'loc=/Volumes/MyDATA&view=large', 'loc=/Volumes/MyDATA&view=tiles', 'loc=/Volumes/MyDATA&view=list', 'loc=network', 'loc=trash', 'theme=light&loc=/Volumes/MyDATA',
    'loc=/Volumes/MyDATA&search=re', 'addr=1&loc=/Volumes/MyDATA/Dev', 'win=mac',
  ];
  const browser = await chromium.launch();
  let bad = 0;
  for (const s of states) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(file + '#' + s);
    await page.waitForTimeout(250);
    // exercise a few interactions
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.keyboard.press('Control+t').catch(() => {});
    await page.keyboard.press('Control+w').catch(() => {});
    if (errs.length) { bad++; console.log('STATE', JSON.stringify(s), '\n  ', errs.join('\n   ')); }
    await page.close();
  }
  await browser.close();
  console.log(bad ? `${bad} state(s) with errors` : `all ${states.length} states OK`);
})();
