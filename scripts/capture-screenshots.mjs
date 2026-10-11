import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = '/opt/cursor/artifacts/screenshots';
mkdirSync(out, { recursive: true });

const routes = [
  ['home', '/'],
  ['units', '/units'],
  ['unit-detail', '/units/placeholder'],
  ['compare', '/compare'],
  ['research', '/research/germany'],
  ['factions', '/factions/germany'],
  ['patches', '/patches'],
  ['sources', '/sources'],
  ['about', '/about'],
  ['404', '/this-page-does-not-exist-xyz'],
];
const viewports = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
];
const themes = ['dark', 'light'];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const files = [];

for (const [vpName, vp] of viewports) {
  await page.setViewportSize(vp);
  for (const theme of themes) {
    for (const [name, urlPath] of routes) {
      await page.goto('http://localhost:3000' + urlPath, { waitUntil: 'networkidle', timeout: 30000 });
      await page.evaluate((t) => {
        localStorage.setItem('theme', t);
        if (t === 'light') document.documentElement.classList.remove('dark');
        else document.documentElement.classList.add('dark');
      }, theme);
      await page.waitForTimeout(300);
      const file = `${out}/${name}-${vpName}-${theme}.png`;
      await page.screenshot({ path: file, fullPage: true });
      files.push(file);
      console.log('wrote', file);
    }
  }
}

await browser.close();
console.log('TOTAL', files.length);
