// Prints do README contra o ambiente local com o seed recém-rodado.
// Uso: node scripts/screenshots.mjs (PLAYWRIGHT_PATH aponta para o pacote playwright, se não estiver instalado).
// A home sai crua em RAW_DIR, para as molduras dos mockups (preview-desktop e preview-mobile) serem montadas à parte.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');

const web = process.env.WEB_URL ?? 'http://localhost:5173';
const api = process.env.API_URL ?? 'http://localhost:3000';
const assets = new URL('../docs/assets/', import.meta.url).pathname;
const raw = process.env.RAW_DIR ?? tmpdir();

async function lotByNumber(number) {
  const response = await fetch(`${api}/lots/${number}`);
  if (!response.ok) throw new Error(`lote ${number}: ${response.status}`);
  return response.json();
}

async function shoot(browser, { file, path, width, height }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${web}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: file });
  await context.close();
  console.log(file);
}

const tampered = await lotByNumber(11);
await mkdir(raw, { recursive: true });
const browser = await chromium.launch();
const shots = [
  { file: `${raw}/home-desktop.png`, path: '/', width: 1280, height: 800 },
  { file: `${raw}/home-mobile.png`, path: '/', width: 390, height: 844 },
  {
    file: `${assets}audit-tampered.png`,
    path: `/lots/${tampered.id}/audit`,
    width: 1280,
    height: 900,
  },
];
for (const shot of shots) await shoot(browser, shot);
await browser.close();
