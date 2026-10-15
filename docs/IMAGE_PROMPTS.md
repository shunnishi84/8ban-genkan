# 画像生成プロンプト集

まだ無い画像を生成するためのプロンプト。できた画像は `public/assets/images/` に**表のファイル名のまま**置けば、
コードを触らずに自動で使われる（`src/assets/manifest.ts` で登録済み）。

## 共通スタイル（全プロンプトの頭に付ける）

既存の絵（玄関・妻・コンビニ）に合わせるための共通指定。

```
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
slightly comedic, muted cool blue-gray night palette with soft fluorescent light,
consistent with a mobile casual game, no text, no letters, no watermark
```

* 文字は入れない指定にしてある（AI が描く文字は崩れやすいので、看板などは「読めない程度のぼかし」にする）
* 背景は **縦 9:16**（例: 1080×1920）。少しはみ出しても中央基準で切り取って表示される
* アイテム・オーバーレイは **透過 PNG**。透過が出せない場合は「plain white background」で生成すれば、こちらで抜き処理できる
* PNG 以外（JPG など）で置くときは、`src/assets/manifest.ts` の `file` の拡張子も合わせる
* できれば既存の `bg_door.png` を参照画像（image-to-image / スタイル参照）に指定すると絵柄が揃う

---

## 1. 背景（縦 9:16）

| ファイル | 用途 |
|---|---|
| `bg_town.jpg` | 「引き返す」で出る夜の街 ✅ 作成済み |
| `bg_trash.jpg` | ゴミ捨て場 ✅ 作成済み |
| `bg_bench.jpg` | 公園のベンチ（通販を使う場所） ✅ 作成済み |
| `clear.jpg` | 8日連続クリアの画面 ✅ 作成済み |

**bg_town.png**
```
[共通スタイル], vertical 9:16 background, a quiet Japanese residential street at 11pm
seen from eye level, a small apartment building on the left, a glowing convenience store
on the right corner, a vending machine casting cold light, utility poles and tangled
electric wires, empty road, light drizzle reflections on asphalt, lonely but slightly
humorous mood, no people
```

**bg_trash.png**
```
[共通スタイル], vertical 9:16 background, a Japanese neighborhood garbage collection point
at night, green crow-protection net over a few tied garbage bags, a small metal sign board
with unreadable blurred text, a street lamp above, concrete block wall, no people
```

**bg_bench.png**
```
[共通スタイル], vertical 9:16 background, a small Japanese neighborhood park at night,
one wooden bench under a single street lamp, a phone-sized patch of light on the bench,
swings in the dark background, a few moths around the lamp, calm and quiet, no people
```

**clear.png**
```
[共通スタイル] but warm morning palette instead of night, vertical 9:16, a married couple
in their 30s-40s at a small dining table in a Japanese apartment, the husband in a
white shirt and the wife in a floral apron (same characters as reference), both smiling
over breakfast and coffee, morning sunlight through the window, cozy and relieved mood,
celebratory feeling
```
→ 夫・妻は既存の `hero.png` と `wife_smile.png` を参照に指定すると同じ顔になる。

---

## 2. 玄関前のオーバーレイ（透過 PNG）

窓の上に重ねる画像は、**窓枠ごと**描く（既存の `window_garland.png` と同じ作り）。
縦横比は **約 1:2.2（例: 430×930）**。`bg_door.png` の右側の窓と同じ枠になるよう、参照画像に指定するのが確実。

| ファイル | 用途 | 縦横比 |
|---|---|---|
| `window_candle.png` | 結婚記念日（窓にキャンドル） | 1:2.2（窓枠ごと） |
| `window_tv.png` | テレビ取材（窓にテレビの青い光） | 1:1.4（窓の内側の光だけでも可） |
| `garbage_bag.png` | 玄関脇のゴミ袋（持ち物アイコンにも使う） | 約 5:6 |
| `wet_floor.png` | 足元の水たまり（傘の置き忘れ） | 約 9:1（横長） |

**window_candle.png**
```
[共通スタイル], a narrow vertical apartment hallway window with a dark metal frame,
seen from outside at night, inside the window: three lit candles on a table and a
small glass of red wine, warm orange flickering glow, romantic but a bit lonely,
transparent background outside the window frame
```

**window_tv.png**
```
[共通スタイル], a narrow vertical apartment hallway window with a dark metal frame,
seen from outside at night, the room inside is dark except for a flickering blue-white
light from a television, faint silhouette of a woman sitting with crossed arms
watching it, ominous and comedic, transparent background outside the window frame
```

**garbage_bag.png**
```
[共通スタイル], a single semi-transparent white 45-liter Japanese garbage bag, tied at
the top, bulging and stuffed full, standing on the floor, slight shadow under it,
isolated on transparent background
```

**wet_floor.png**
```
[共通スタイル], a wide flat puddle of rainwater on a concrete floor with a few drops,
seen from slightly above, wide horizontal shape, subtle blue reflections,
isolated on transparent background
```

---

## 3. 持ち物アイコン（透過 PNG・正方形、512×512 程度）

共通の後半:
```
..., single object centered, simple and readable at small size, isolated on transparent background
```

| ファイル | 中身 | プロンプト（共通スタイル + ↓ + 共通の後半） |
|---|---|---|
| `item_cake.png` | いちごショートケーキ2個入り | `two slices of strawberry shortcake in a clear plastic convenience-store container` |
| `item_ice_cream.png` | ちょっと高いバニラアイス | `a small premium vanilla ice cream cup with a gold lid` |
| `item_glue.png` | 強力瞬間接着剤 | `a small tube of super glue in yellow and red packaging, no readable text` |
| `item_broken_mug.png` | 割れた妻の青いマグカップ | `a broken blue ceramic mug in three pieces, partly wrapped in newspaper` |
| `item_fixed_mug.png` | 接着剤で直したマグカップ | `a blue ceramic mug repaired with visible glued crack lines, slightly crooked but whole` |
| `item_onsen_ticket.png` | 温泉ペア宿泊ギフト | `an elegant Japanese hot spring gift voucher envelope with a red seal and steam motif` |
| `item_golf_club.png` | 高級ドライバー | `a flashy expensive golf driver with a glittering galaxy-patterned head` |
| `item_empty_can.png` | ハイボールの空き缶 | `a crushed empty highball can, silver and blue, no readable text` |
| `item_ring.png` | 結婚指輪 | `a simple gold wedding ring with a soft sparkle` |
| `item_mint.png` | 息リフレッシュ粒 | `a small plastic case of breath mint tablets, mint green` |

---

## 4. 手がかりのイラスト（透過 PNG または背景つき、横 4:3 程度）

| ファイル | 用途 |
|---|---|
| `tv_capture.png` | テレビ取材の見逃し配信の画面（スマホの通知に添える） |
| `kouhai_notice.png` | 後輩女子からの通知（スマホの通知に添える） |

**tv_capture.png**
```
[共通スタイル], a TV news screen capture of a street interview at night in a Japanese
business district, a tired salaryman in a white shirt and tie (same character as reference)
laughing nervously into a microphone, a lower-third caption bar with unreadable blurred
text, TV-screen framing, 4:3
```
→ `hero.png` を参照に指定。

**kouhai_notice.png**
```
[共通スタイル], a smartphone lock-screen notification card close-up, a cute young
female coworker's round avatar icon with a peace sign, small pink heart stickers,
unreadable blurred message text, glowing in a dark room, 4:3
```

---

## 5. 魔王化した妻（暴言を送った日の結末）— Gemini 用

| ファイル | 用途 | 形式 |
|---|---|---|
| `wife_demon.jpg` | 暴言チャットを送った日、ドアを開けると待っている魔王 ✅ 作成済み（3:4 のまま横幅いっぱいで表示） | 縦長、背景つき |

画像が無いあいだは、`wife_angry.png` を紫に染めた代用表示になる（オーラ・火の粉・稲妻はコード側で重ねる）。

**Gemini での作り方**
1. Gemini に `public/assets/images/wife_angry.png`（鬼の形相の妻）を**添付**する
2. 下のプロンプトを貼る（英語版の方が絵柄は安定しやすい。日本語版でも可）
3. 気に入らなければ「もっとコミカルに」「オーラをもっと大きく」など追加で指示して描き直す

**英語版**
```
Use the attached image as the character reference. Keep the exact same woman: same face
shape, short dark brown bob hair, beige long-sleeve top and the same pink floral apron.

Transform her into a comically over-the-top DEMON QUEEN, one level beyond the angry version.
She stands in the same narrow Japanese apartment entrance (genkan) at night, facing the
viewer, vertical 9:16 composition.

- Long curved black horns (bigger than the small red ones in the reference)
- Eyes glowing solid white-violet with no pupils, a wide sinister grin instead of shouting
- Hair floating upward as if charged with static electricity
- A huge swirling aura of dark purple and black flames filling the whole background,
  with ghostly wisps shaped like tiny screaming faces
- Purple lightning crackling around her, the door frame bending, small cracks in the floor
- One finger slowly pointing at the viewer, the other hand on her hip
- The floral apron stays on, for comedic contrast
- In the lower corner, a tiny chibi silhouette of a terrified salaryman in a white shirt
  and tie, kneeling in seiza

Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
matching the art style of the reference image. Comedic horror, not scary for real.
No blood, no gore, no weapons, no text, no letters, no watermark.
```

**日本語版**
```
添付画像の女性をキャラクターの参考にしてください。顔立ち、こげ茶のショートボブ、
ベージュの長袖、ピンクの花柄エプロンはそのまま同じ人物にしてください。

その女性が、怒りを通り越して「魔王」になった姿を描いてください。
夜の日本のマンションの狭い玄関に立ち、こちらを向いている、縦長 9:16 の構図です。

・参考画像の小さな赤い角より大きい、黒く長く湾曲した角
・瞳のない、白紫に光る目。叫ぶのではなく、不気味にニヤリと笑っている
・静電気を帯びたように逆立って浮かぶ髪
・背景いっぱいに渦巻く、黒と濃い紫の巨大な邪悪なオーラの炎。小さな叫び顔のような霊の筋が混じる
・周囲に走る紫の稲妻。ゆがむドア枠、床に入る小さなひび
・片手の指でゆっくりこちらを指さし、もう片手は腰に
・花柄エプロンはそのまま（ギャップで笑える感じ）
・画面の下の隅に、白シャツにネクタイの小さなちびキャラのサラリーマンが、怯えて正座している

参考画像と同じ、日本の漫画風デジタルイラスト。くっきりした太い黒の線、フラットなセル塗り。
本気で怖いホラーではなく、笑えるコミカルな怖さ。
血、流血、武器、文字、ロゴ、透かしは入れないでください。
```

---

## 6. Gemini で残りをまとめて作る（貼るだけ版）

Gemini は透過 PNG を出せないことが多いので、背景は**白**で作って、こちらで抜く。
窓の絵は `bg_door.png` と `window_garland.png` を、取材画面は `hero.png` を添付して使う。

### 6-1. window_candle.png（添付: bg_door.png, window_garland.png）
```
The first attached image is a Japanese apartment entrance at night. The second attached image
shows how the narrow window on the right side of the door was redrawn on its own, with
decorations inside it. Make another image exactly like the second one: ONLY that same narrow
vertical window, same dark metal frame, same straight-on angle, same tall and narrow
proportions (about 1:2.2), cropped tightly to the frame with nothing outside it.
Inside the window this time: three lit candles on a small table and a glass of red wine,
warm orange flickering glow in an otherwise dark room, romantic but a little lonely.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
same art style as the references. No text, no letters, no watermark.
```

### 6-2. window_tv.png（添付: bg_door.png, window_garland.png）
```
The first attached image is a Japanese apartment entrance at night. The second attached image
shows how the narrow window on the right side of the door was redrawn on its own. Make another
image exactly like the second one: ONLY that same narrow vertical window, same dark metal
frame, same straight-on angle, same tall and narrow proportions (about 1:2.2), cropped
tightly to the frame with nothing outside it.
Inside the window this time: a dark room lit only by the flickering blue-white light of a
television, and the faint silhouette of a woman with short bob hair sitting with her arms
crossed, staring at the screen. Ominous but comedic.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
same art style as the references. No text, no letters, no watermark.
```

### 6-3. garbage_bag.png
```
A single semi-transparent white 45-liter Japanese household garbage bag, tied at the top,
bulging and stuffed full, standing upright with a slight shadow under it. Seen from the
front at eye level. Japanese manga-style digital illustration, clean bold black outlines,
flat cel shading, muted cool night colors. Isolated object centered on a plain pure white
background, nothing else in the image. No text, no watermark.
```

### 6-4. wet_floor.png
```
A wide, flat puddle of rainwater on the floor, seen from slightly above, very wide
horizontal shape (about 9:1), a few water droplets around it, subtle blue reflections,
dark outline. Japanese manga-style digital illustration, clean bold black outlines, flat
cel shading. Isolated object centered on a plain pure white background, nothing else in
the image. No text, no watermark.
```

### 6-5. 持ち物アイコン10個（1枚にまとめて描かせる → こちらで切り出す）
```
A sprite sheet of 10 separate game item icons arranged in a neat 5 columns x 2 rows grid
on a plain pure white background. Each icon is a single object, centered in its own cell,
with plenty of white space between icons, nothing touching or overlapping, no labels,
no numbers, no frames.
Row 1, left to right:
1. two slices of strawberry shortcake in a clear plastic convenience-store container
2. a small premium vanilla ice cream cup with a gold lid
3. a small tube of super glue in yellow and red packaging
4. a broken blue ceramic mug in three pieces, partly wrapped in newspaper
5. a blue ceramic mug repaired with visible glued crack lines, slightly crooked but whole
Row 2, left to right:
6. an elegant Japanese hot spring gift voucher envelope with a red seal and a steam motif
7. a flashy expensive golf driver with a glittering galaxy-patterned head
8. a crushed empty highball can, silver and blue
9. a simple gold wedding ring with a soft sparkle
10. a small plastic case of breath mint tablets, mint green
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
simple and readable at small size, consistent style across all icons.
No text, no letters, no watermark.
```
→ 順番どおりに `item_cake / item_ice_cream / item_glue / item_broken_mug / item_fixed_mug /
item_onsen_ticket / item_golf_club / item_empty_can / item_ring / item_mint` として切り出す。

### 6-6. tv_capture.png（添付: hero.png）
```
Use the attached image as the character reference: the same tired Japanese salaryman with
short black hair, white shirt and dark tie. Draw a TV news screen capture of a nighttime
street interview in a busy Japanese business district: he is laughing nervously and a bit
drunk, talking into a microphone held out from the side by an unseen reporter, neon signs
blurred in the background. Add a TV-style lower-third caption bar and a small channel logo
area, but with blurred, unreadable shapes instead of real text. Landscape 4:3 framing like a
TV screen. Japanese manga-style digital illustration, clean bold black outlines, flat cel
shading. No readable text, no watermark.
```

### 6-7. kouhai_notice.png
```
Close-up of a smartphone lock-screen notification card glowing in a dark room. The card shows
a round avatar icon of a cheerful young female office worker making a peace sign, small pink
heart stickers floating around the card, and a few lines of blurred, unreadable message text.
Slightly suspicious, comedic mood. Landscape 4:3. Japanese manga-style digital illustration,
clean bold black outlines, flat cel shading. No readable text, no watermark.
```

---

## 置いたあとの確認

1. `npm run dev` で起動
2. `?debug&scenario=anniversary_forgot`（キャンドル）、`?debug&scenario=tv_interview`（テレビの光・取材画面）
   のようにシナリオを固定すると、その画像が出る場面にすぐ行ける
3. 窓のオーバーレイがずれる場合は `src/ui/renderer.ts` の `OVERLAY_RECTS` で位置を調整する
