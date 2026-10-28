// 予告編に使うゲーム画面を撮る（promo/shots/*.png）。
//   npm run build && npx vite preview --port 4173 &   （先にゲームを立ち上げておく）
//   node promo/capture.mjs
// ?debug&scenario=... でその日のシナリオを固定して、デバッグ表示は隠して撮る
import { mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pw = await import('playwright').catch(() => import(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.js')));
const chromium = pw.chromium ?? pw.default.chromium;
const OUT = fileURLToPath(new URL('shots', import.meta.url));
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? undefined });
const open = async (scenario) => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto(`${BASE}?debug&scenario=${scenario}`);
  await p.addStyleTag({ content: '.debug{display:none!important}' });
  await p.waitForTimeout(600);
  await p.click('text=はじめる');
  await p.waitForTimeout(300);
  await p.click('.intro');
  await p.waitForTimeout(500);
  return p;
};
const btn = async (p, label, exact = false) => {
  const ok = await p.evaluate(([label, exact]) => {
    const b = [...document.querySelectorAll('button')].filter((x) => (exact ? x.textContent.trim() === label : x.textContent.includes(label))).pop();
    b?.click();
    return !!b;
  }, [label, exact]);
  if (!ok) throw new Error(`ボタンが無い: ${label}`);
  await p.waitForTimeout(350);
};
const shot = async (p, name) => {
  await p.waitForTimeout(400);
  await p.screenshot({ path: join(OUT, `${name}.png`) });
  console.log('shot', name);
};
const tap = async (p, n = 1) => {
  for (let i = 0; i < n; i++) {
    await p.mouse.click(195, 700);
    await p.waitForTimeout(350);
  }
};
const openDoor = async (p) => {
  await btn(p, 'ドアを開ける');
  await btn(p, '開ける', true);
  await p.waitForTimeout(500);
};

let p = await open('ring_off');
await shot(p, 'door');
await openDoor(p);
await tap(p);
await shot(p, 'angry');
await tap(p, 4);
await shot(p, 'gameover');

p = await open('bento_mold');
await p.mouse.click(195, 450);
await shot(p, 'spot_bento');

p = await open('laundry_dye');
await btn(p, 'スマホ');
await btn(p, '💬');
await shot(p, 'chat_blouse');

p = await open('health_check');
await btn(p, 'スマホ');
await btn(p, '💬');
await shot(p, 'chat_health');

p = await open('pudding_eaten');
await btn(p, '引き返す');
await btn(p, 'コンビニ');
await shot(p, 'konbini');

p = await open('liver_holiday');
await btn(p, '引き返す');
await btn(p, 'ゴミ捨て場');
await shot(p, 'trash');

p = await open('neighbor_curry');
await openDoor(p);
await tap(p);
await shot(p, 'home');

p = await open('twoshot_photo');
await btn(p, 'スマホ');
await btn(p, '💬');
await btn(p, '俺の浮気相手だよ');
await shot(p, 'chat_uwaki');
await btn(p, '戻る');
await btn(p, '閉じる');
await openDoor(p);
await tap(p, 2);
await shot(p, 'demon1');

p = await open('sns_tsuno');
await btn(p, 'スマホ');
await btn(p, '📣');
await shot(p, 'sns');

await browser.close();
