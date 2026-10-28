// 予告編を書き出す。
//   node promo/render.mjs <出力フォルダ> [landscape|portrait|both] [--stills 0,12.5,22.1]
// --stills を付けると、指定した秒のフレームだけ PNG で書き出す（確認用）
// 先に promo/capture.mjs でゲーム画面（promo/shots/）を撮っておくこと。音は promo/audio.py
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execSync, spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// Playwright はプロジェクトに入れていないので、無ければグローバルのものを使う
const pw = await import('playwright').catch(() => import(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.js')));
const chromium = pw.chromium ?? pw.default.chromium;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const [outDir = 'promo/out', which = 'both', ...rest] = process.argv.slice(2);
const stillsArg = rest[rest.indexOf('--stills') + 1];
const stills = rest.includes('--stills') ? stillsArg.split(',').map(Number) : null;
const SIZES = { landscape: [1920, 1080], portrait: [1080, 1920] };
const TYPES = { '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

// リポジトリ直下を配る小さな静的サーバー（フォントと画像を読むため）
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, ok));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? undefined });
await mkdir(outDir, { recursive: true });

for (const orient of which === 'both' ? ['landscape', 'portrait'] : [which]) {
  const [w, h] = SIZES[orient];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`http://localhost:${port}/promo/trailer.html?orient=${orient}`);
  await page.waitForFunction(() => window.ready || window.initError, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.initError);
  if (err) throw new Error(err);
  const frames = await page.evaluate(() => window.FRAMES);

  if (stills) {
    for (const s of stills) {
      const data = await page.evaluate((f) => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/png'); }, Math.round(s * 30));
      const file = join(outDir, `${orient}_${String(s).replace('.', '_')}.png`);
      await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
      console.log('still', file);
    }
    await page.close();
    continue;
  }

  // JPEG を ffmpeg にそのまま流し込んで H.264 にする（音はあとで合わせる）
  const out = join(outDir, `video_${orient}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let f = 0; f < frames; f++) {
    const data = await page.evaluate((f) => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, f);
    if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (f % 150 === 0) console.log(`${orient}: ${f}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((ok, ng) => ff.on('close', (c) => (c === 0 ? ok() : ng(new Error(`ffmpeg ${c}`)))));
  console.log('wrote', out);
  await page.close();
}
await browser.close();
server.close();
