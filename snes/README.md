# 8番玄関 スーパーファミコン版（試作品）

ブラウザ版の 8番玄関 から、異変ひとつ（**結婚指輪を外したまま**）・1日目だけを切り出したスーパーファミコン用 ROM。

## 遊び方（Android + John NESS）

1. `dist/8ban-genkan.sfc` をスマホに入れる（ダウンロードフォルダなど）
2. John NESS を開いて、ROM の一覧からこのファイルを選ぶ
3. 十字キーで選んで、A（または START）で決定、B で戻る

玄関の前で「調べる」「持ち物」「スマホ」を使って怒りの火種を探し、片付けてから「ドアを開ける」。
調べたりスマホを見たりすると時間が進み、翌 1:00 を過ぎてからドアを開けると「遅すぎる帰宅」になる。

## しくみ

| ファイル | 中身 |
|---|---|
| `build.py` | 文章を 1 ページずつ IPAゴシック 12px で描いて 2bpp タイルにし、絵を 256×160 に切り出して 16 色 × 7 パレットに減色する。流れは `story()` に小さなスクリプトで書く |
| `src/main.s` | 65816 のエンジン。スクリプト（バイトコード）を読みながら、絵の差し替え・文字の窓・メニュー・時計を動かす |
| `test_rom.py` | snes9x の libretro コアを ctypes で直接動かし、ボタン操作を流し込んでスクリーンショットを撮る |

- 画面: Mode 1。BG1 = 絵（4bpp）、BG3 = 文字の窓と上の帯（2bpp）、スプライト = カーソル ▶ と送り ▼
- スクリプトの命令: `RESET` `PAGE` `MENU` `JUMP` `SET` `IF` `ADDTIME` `IMAGE` `IFLATE` `HUD` `SHAKE` `FADE`
- 1 ページ = 4KB の文字タイルを、垂直帰線中に DMA で丸ごと送る。文字コードやフォントを ROM に持たないので、日本語がそのまま出せる

## 作り直す

```bash
sudo apt install cc65 fonts-ipafont-gothic libretro-snes9x   # libretro-snes9x はテストだけに使う
python3 -m pip install pillow numpy
npm run snes:build        # → snes/build/8ban-genkan.sfc（snes/dist/ にもコピー）
python3 snes/test_rom.py  # → snes/build/shots/*.png
```

## まだないもの

音（SPC700）、2日目以降、ほかの異変、セーブ。
