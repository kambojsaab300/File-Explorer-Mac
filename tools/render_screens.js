// Renders the documented screens of the prototype into design/screens/*.png
// Usage: node tools/render_screens.js
const { chromium } = require('playwright');
const path = require('path');

const SCREENS = [
  ['01-this-pc-dark', ''],
  ['02-folder-content-view-dark', 'loc=/Volumes/MyDATA&view=content&expand=/Volumes/MyDATA'],
  ['03-folder-details-view-with-details-pane-dark', 'loc=/Volumes/MyDATA&view=details&sel=UI Issues.docx&details=1'],
  ['04-context-menu-dark', 'loc=/Volumes/MyDATA&view=details&sel=Dev&ctx=item'],
  ['05-background-context-menu-dark', 'loc=/Volumes/MyDATA&view=details&ctx=bg'],
  ['06-view-menu-dark', 'loc=/Volumes/MyDATA&view=details&menu=view'],
  ['07-home-light', 'theme=light&loc=home'],
  ['08-gallery-dark', 'loc=gallery'],
  ['09-large-icons-light', 'theme=light&loc=/Users/you/Pictures&view=large'],
  ['10-tiles-view-dark', 'loc=/Users/you/Downloads&view=tiles'],
  ['11-address-bar-editing-dark', 'loc=/Volumes/MyDATA/Dev/khoj&view=details&addr=1&expand=/Volumes/MyDATA,/Volumes/MyDATA/Dev'],
  ['12-search-results-dark', 'loc=/Volumes/MyDATA&view=details&search=re'],
  ['13-copy-progress-dark', 'dialog=copy&stop=900&view=details'],
  ['14-replace-or-skip-dark', 'dialog=conflict&view=details'],
  ['15-onboarding-permissions-dark', 'dialog=onboarding&loc=home'],
  ['16-options-dialog-light', 'theme=light&dialog=settings&loc=/Volumes/MyDATA&view=details'],
  ['17-properties-dialog-dark', 'loc=/Volumes/MyDATA&view=details&sel=Investigation Report.pdf&dialog=properties'],
  ['18-drive-details-pane-dark', 'sel=MyDATA&details=1'],
  ['19-macos-window-buttons-light', 'theme=light&win=mac&loc=/Users/you/Documents&view=details&tabs=/Volumes/MyDATA,gallery'],
  ['20-rename-inline-dark', 'loc=/Volumes/MyDATA&view=details&sel=build_output.txt&rename=1'],
  ['21-quick-look-dark', 'loc=/Users/you/Pictures&view=large&sel=IMG_2043.jpg&dialog=quicklook'],
  ['22-full-window-no-desktop-dark', 'frame=0&loc=/Volumes/MyDATA&view=content&tabs=/Users/you/Downloads,home'],
];

(async () => {
  const root = path.resolve(__dirname, '..');
  const file = 'file://' + path.join(root, 'design/prototype/index.html');
  const browser = await chromium.launch();
  for (const [name, hash] of SCREENS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(file + '#' + hash);
    await page.waitForTimeout(name.includes('copy') ? 1100 : 450);
    await page.screenshot({ path: path.join(root, 'design/screens', name + '.png') });
    await page.close();
    console.log('✓', name);
  }
  await browser.close();
})();
