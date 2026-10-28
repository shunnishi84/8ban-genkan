#!/usr/bin/env bash
# 予告編（横 16:9 と縦 9:16）を作る。ゲーム画面の撮影 → 映像 → 音 → 合成
#   promo/build.sh [出力フォルダ]
# 必要なもの: node, ffmpeg, python3 + numpy, Playwright の Chromium（CHROME で実行ファイルを指定できる）
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-promo/out}"
mkdir -p "$OUT"

npm run build
npx vite preview --port 4173 --strictPort >/dev/null 2>&1 &
PREVIEW=$!
trap 'kill $PREVIEW 2>/dev/null || true' EXIT
sleep 3
node promo/capture.mjs
kill $PREVIEW

node promo/render.mjs "$OUT" both
python3 promo/audio.py "$OUT/trailer.wav"
for o in landscape portrait; do
  # 音量は動画サイトの基準（-14 LUFS）にそろえる
  ffmpeg -y -loglevel error -i "$OUT/video_$o.mp4" -i "$OUT/trailer.wav" \
    -af "loudnorm=I=-14:TP=-1:LRA=11" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart \
    "$OUT/8ban-genkan_trailer_$o.mp4"
  echo "wrote $OUT/8ban-genkan_trailer_$o.mp4"
done
