#!/usr/bin/env bash
# public/assets/images/ の PNG・JPEG を WebP に変換して元のファイルを消し、
# src/assets/manifest.ts と promo/trailer.html のファイル名も書き換える（ImageMagick が必要）。
# 新しい画像を置いたら、そのまま npm run images:webp で軽くできる。
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=public/assets/images
shopt -s nullglob
for src in "$DIR"/*.png "$DIR"/*.jpg "$DIR"/*.jpeg; do
  name=$(basename "$src")
  base="${name%.*}"
  # 透過は残す。イラストなので画質 82 で見た目は変わらない
  convert "$src" -quality 82 -define webp:method=6 -define webp:alpha-quality=90 "$DIR/$base.webp"
  rm "$src"
  sed -i "s/'$name'/'$base.webp'/g" src/assets/manifest.ts promo/trailer.html
  echo "$name -> $base.webp"
done
