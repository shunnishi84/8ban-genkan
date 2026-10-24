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
* できれば既存の `bg_door.jpg` を参照画像（image-to-image / スタイル参照）に指定すると絵柄が揃う

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
縦横比は **約 1:2.2（例: 430×930）**。`bg_door.jpg` の右側の窓と同じ枠になるよう、参照画像に指定するのが確実。

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

画像が無いあいだは、`wife_angry.jpg` を紫に染めた代用表示になる（オーラ・火の粉・稲妻はコード側で重ねる）。

**Gemini での作り方**
1. Gemini に `public/assets/images/wife_angry.jpg`（鬼の形相の妻）を**添付**する
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
窓の絵は `bg_door.jpg` と `window_garland.png` を、取材画面は `hero.png` を添付して使う。

### 6-1. window_candle.png（添付: bg_door.jpg, window_garland.png）
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

### 6-2. window_tv.png（添付: bg_door.jpg, window_garland.png）
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

## 7. 暴言コンプリートのフィナーレ用 ＋ 残りの持ち物アイコン（Gemini）

| ファイル | 用途 | 添付する見本 |
|---|---|---|
| `castle_gate.png` | 魔王城: 玄関ドアに重ねる魔王城の門 | `bg_door.jpg` |
| `bg_court.jpg` | 家庭裁判の法廷 | `wife_suspicious.png` |
| `bg_siege.jpg` | 包囲網: 玄関に集まった家族会議の面々 | `wife_suspicious.png` |
| `bg_lockout.jpg` | 締め出し: 布団が出された玄関前 | `bg_door.jpg` |
| `bg_exposed.jpg` | 公開処刑: 全部の窓が開いたマンション | `wife_smile.png` |
| `item_*.png` 8種 × 2枚 | 持ち物アイコン（シートで作ってこちらで切り出す） | なし |

背景は縦 9:16。門とアイコンは白背景で作れば、こちらで抜く。

### 7-1. castle_gate.png（添付: bg_door.jpg）
```
The attached image is a Japanese apartment entrance at night. Redraw ONLY its front door
(including the door frame), keeping the same straight-on angle and the same tall
rectangular proportion (about 1:1.75), but transformed into a huge, ominous demon lord's
castle gate: heavy dark iron double doors with glowing purple runes, iron spikes and
rivets, a horned skull-like crest at the top, hanging chains, and purple mist leaking from
the gap between the doors. A small blank plaque above the doors with no text.
Crop tightly to the gate, plain pure white background outside it.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
comedic over-the-top fantasy, same art style as the reference. No text, no watermark.
```

### 7-2. bg_court.jpg（添付: wife_suspicious.png）
```
Use the attached image as the character reference for the wife (same face, short dark bob
hair, floral apron). Vertical 9:16. A small Japanese apartment living room at night turned
into a parody courtroom: the wife sits at a judge's bench made from the dining table,
wearing a black judge's robe over her floral apron, holding a wooden gavel, stern face.
An elderly mother-in-law in a cardigan stands at a desk as the prosecutor, holding a stack
of printed papers. In front, an empty defense table with one small sad chair. Neighbors sit
on folding chairs as the gallery, whispering. A blank projector screen on the back wall.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
comedic tension. No text, no letters, no watermark.
```

### 7-3. bg_siege.jpg（添付: wife_suspicious.png）
```
Use the attached image as the character reference for the wife (same face, short dark bob
hair, floral apron). Vertical 9:16, viewpoint of a husband standing at the open front door
of a Japanese apartment at night. On the genkan floor, four pairs of other people's shoes
are lined up neatly. Beyond the step, the wife stands with arms crossed; next to her an
elderly mother-in-law smiling too politely, a stern father-in-law in a cardigan with arms
folded, and the wife's friend holding up a smartphone to film. Everyone is looking straight
at the viewer. Tense, comedic "family meeting" mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 7-4. bg_lockout.jpg（添付: bg_door.jpg）
```
Use the attached image as the reference for the location: the same Japanese apartment
outdoor corridor and front door at night. Vertical 9:16. The door is shut. On the floor
beside it, a futon set and a pillow are neatly folded and stacked, as if put out for
someone. A sheet of paper is taped to the door with blurred, unreadable writing. Past the
corridor railing, a lonely night sky with a few stars and a thin moon. No people.
Melancholic but comedic mood. Japanese manga-style digital illustration, clean bold black
outlines, flat cel shading, cool blue night palette. No readable text, no watermark.
```

### 7-5. bg_exposed.jpg（添付: wife_smile.png）
```
Vertical 9:16. A 5-story Japanese apartment building at night, seen from the ground in
front of the entrance. Every single window and balcony is open, and in each one a
resident's silhouette is leaning out, silently staring down at the viewer. On one
second-floor balcony stands the wife from the attached reference image (same face, short
dark bob hair, floral apron), calmly holding a megaphone. A notice board at the entrance
has a paper pinned to it with blurred, unreadable text. Dramatic light falling on the
ground where the viewer stands. Comedic public-humiliation mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No readable text, no watermark.
```

### 7-6. 持ち物アイコン シートA（コンビニの8種）
```
A sprite sheet of 8 separate game item icons arranged in a neat 4 columns x 2 rows grid
on a plain pure white background. Each icon is a single object, centered in its own cell,
with plenty of white space between icons, nothing touching or overlapping, no labels,
no numbers, no frames.
Row 1, left to right:
1. a premium convenience-store roll cake in a clear plastic package
2. a half bottle of red wine
3. a small cup of smooth custard pudding with a caramel top
4. a plain navy blue necktie, neatly folded
Row 2, left to right:
5. a cheap generic laundry detergent refill pouch, light blue, no brand
6. a clear plastic vinyl umbrella, closed
7. a gift box of assorted snacks and cookies
8. a can of beer, gold and white
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
simple and readable at small size, consistent style across all icons.
No text, no letters, no watermark.
```
→ 順番に `item_sweets / item_wine / item_konbini_pudding / item_navy_tie /
item_detergent_generic / item_vinyl_umbrella / item_snack_box / item_beer` として切り出す。

### 7-7. 持ち物アイコン シートB（通販など8種）
```
A sprite sheet of 8 separate game item icons arranged in a neat 4 columns x 2 rows grid
on a plain pure white background. Each icon is a single object, centered in its own cell,
with plenty of white space between icons, nothing touching or overlapping, no labels,
no numbers, no frames.
Row 1, left to right:
1. a premium botanical laundry detergent refill pouch, green with leaf motif
2. a pair of elegant wine glasses with engraved initials, tied with a ribbon
3. a pink umbrella with a floral pattern, closed
4. a fancy kiln-baked custard pudding in a small glass jar with a ribbon
Row 2, left to right:
5. a traditional Japanese sweets gift box wrapped in noshi paper with a red and white cord
6. an elegant spa and massage pair gift voucher envelope with a lotus motif
7. a TV remote control next to a small dark purple subscription card with a crescent moon logo
8. a photo book whose cover shows a bright summer beach with a parasol and a straw hat,
   no people on the cover
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
simple and readable at small size, consistent style across all icons.
No text, no letters, no watermark.
```
→ 順番に `item_detergent_refill / item_pair_glass / item_umbrella_same / item_limited_pudding /
item_kashiori / item_spa_ticket / item_av_subscription / item_gravure_book` として切り出す。
`item_gravure_book` は持ち物アイコンのほか、玄関マットの上に置かれた写真集としても使う。

---

## 8. 渋々許す妻（wife_sullen.png）— Gemini 用

小言つきで許してくれる日（ゴミ出し忘れ、注文のキャンセル、AV の解約など）の帰宅画面。
笑顔の `wife_smile.png` と同じ構図・同じ服で、表情だけ「無表情で渋々」にする。
置くまでは笑顔の絵で代用される。

| ファイル | 用途 | 添付する見本 |
|---|---|---|
| `wife_sullen.png` | 渋々許す日の「……おかえり。」 | `wife_smile.png` |

```
Use the attached image as the strict reference: redraw the exact same scene with the same
woman (same face, short dark bob hair, cream long-sleeve top, floral apron), the same
Japanese apartment entrance hallway behind her, the same camera angle, framing and
vertical 9:16 composition. Change ONLY her expression and pose: a flat, expressionless,
slightly sulky face, eyes half-lidded and looking a little to the side, mouth a small
straight line, eyebrows level. Arms loosely crossed in front of the apron instead of hands
clasped. She is forgiving her husband reluctantly — not angry, not smiling, just "fine,
whatever." Slightly cooler, dimmer lighting than the reference.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
same art style as the reference. No text, no letters, no watermark.
```

---

## 9. 逆転裁判風の法廷（カメラ切り替え）＋ 魔王の最終形態 — Gemini 用

家庭裁判では、話している人の席にカメラが切り替わる（法廷バトルゲーム風）。
置いていない視点は `bg_court.jpg`（法廷全体）で代用される。どれも縦 9:16。

| ファイル | 映すもの | 添付する見本 |
|---|---|---|
| `bg_court.jpg` | 法廷全体（作り直し。今の「リビングの即席法廷」を本格的な法廷に） | `wife_suspicious.png` |
| `bg_court_judge.jpg` | 裁判長席の妻（木槌） | `wife_suspicious.png` |
| `bg_court_defense.jpg` | 弁護席の主人公（被告人が自分で弁護） | `hero.png` |
| `bg_court_prosecutor.jpg` | 検察席の義母 | `bg_court.jpg`（今のもの。義母の顔合わせ用） |
| `bg_court_witness.jpg` | 証言台の妻 | `wife_suspicious.png` |
| `wife_demon_final.jpg` | 魔王の最終形態（缶ビール3本で暴言を全部送った日の魔王城） | `wife_demon.jpg` |

共通の雰囲気: 日本の法廷バトル・アドベンチャーゲーム風。暖色の木目の法廷、緑のカーペット、
正面から見たはっきりした構図、キャラクターは腰から上で大きく、背景はシンプル。
**文字は入れない**（法廷のプレートや書類は無地か読めないぼかし）。

### 9-1. bg_court.jpg（添付: wife_suspicious.png）
```
Vertical 9:16. A grand Japanese courtroom in the style of a classic anime courtroom
battle adventure game: warm polished wooden walls and benches, a raised judge's bench
in the center back with a blank round emblem on the wall above it, a witness stand in
the middle facing the judge, the defense desk on the left and the prosecution desk on the
right facing each other, green carpet, rows of gallery seats in the foreground seen
from behind. The judge seated at the high bench is the woman from the attached reference
(same face, short dark bob hair), wearing a black judge's robe, holding a wooden gavel,
stern expression. Bright, clean, slightly dramatic lighting from above.
Japanese anime-style digital illustration, clean bold black outlines, flat cel shading,
vivid but warm colors. No text, no letters, no logos, no watermark.
```

### 9-2. bg_court_judge.jpg（添付: wife_suspicious.png）
```
Vertical 9:16. Close-up view of the judge's bench in a classic anime courtroom battle
game, seen straight on from slightly below. The judge is the woman from the attached
reference (same face, short dark bob hair), wearing a black judge's robe over a floral
apron collar peeking out, seated behind the tall wooden bench, raising a wooden gavel,
one eyebrow raised, unimpressed. Behind her: warm wooden wall panels and a blank round
emblem. She fills the upper half of the frame; the lower third is the bench front, plain
and empty (dialogue box will overlay there).
Japanese anime-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no logos, no watermark.
```

### 9-3. bg_court_defense.jpg（添付: hero.png）
```
Vertical 9:16. The defense desk view of a classic anime courtroom battle game, seen from
the front at a slight angle. The man from the attached reference (same face, same tired
salaryman look, white dress shirt and loosened tie) stands behind the wooden defense desk
alone, both hands slammed on the desk, sweating nervously, leaning forward, trying to
look confident but clearly panicking. Behind him: warm wooden wall panels and a window
with soft light. The lower third is the desk front, plain (dialogue box overlays there).
Japanese anime-style digital illustration, clean bold black outlines, flat cel shading,
comedic. No text, no letters, no logos, no watermark.
```

### 9-4. bg_court_prosecutor.jpg（添付: 今の bg_court.jpg）
```
Vertical 9:16. The prosecution desk view of a classic anime courtroom battle game, seen
from the front at a slight angle (mirror of a defense-desk view). The prosecutor is the
elderly mother-in-law from the attached image (same face, gray hair, cardigan), standing
behind the wooden prosecution desk with a calm, polite, terrifying smile, one finger
pointing sharply forward at the viewer, a neat stack of printed papers on the desk.
Behind her: warm wooden wall panels. The lower third is the desk front, plain
(dialogue box overlays there).
Japanese anime-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no logos, no watermark.
```

### 9-5. bg_court_witness.jpg（添付: wife_suspicious.png）
```
Vertical 9:16. The witness stand view of a classic anime courtroom battle game, seen
straight on. The witness is the woman from the attached reference (same face, short dark
bob hair, floral apron), standing at a small wooden witness stand with both hands on it,
arms tense, looking straight at the viewer with cold, hurt, accusing eyes. Behind her:
a plain warm wooden wall, softly blurred. The lower third is the stand front, plain
(dialogue box overlays there).
Japanese anime-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no logos, no watermark.
```

### 9-6. wife_demon_final.jpg（添付: wife_demon.jpg）
```
Use the attached image as the strict character reference (same woman, same face, same
short dark bob hair, same floral apron, same comedic demon-lord concept). Draw her FINAL
FORM: bigger and more ominous. Much larger curved black horns with glowing red cracks,
a tattered dark crown floating above her head, glowing red eyes, a long black cape made of
swirling shadow flowing from her shoulders, the floral apron now dark crimson with
glowing patterns, floating around her: a ladle, a household account book and a
smartphone, each wreathed in red flame-like aura. Background: a dark throne-room of a
demon castle with red lightning and black smoke. Color palette shifts from purple to deep
crimson and black. Still comedic over-the-top fantasy, NOT gory, no blood, no weapons
other than the household items. Vertical 3:4 composition, same framing as the reference.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

---

## 10. 飲み会の集合写真（group_photo.jpg）— Gemini 用

後輩チャットの日に「【写真】今日の飲み会の集合写真」を送ると、チャットに貼られる写真。
妻の返事は「……部長の隣で目が死んでるね」なので、**主人公は部長の隣で目が死んでいる**のがオチ。
後輩の佐藤さんは端のほうで、ふつうに楽しそうにしているだけ（二人きり感はゼロ）。

| ファイル | 用途 | 添付する見本 |
|---|---|---|
| `group_photo.jpg` | チャットに貼る集合写真（横 4:3） | `hero.png`（主人公）、`kouhai_notice.jpg`（佐藤さんのアイコン） |

```
Use the attached images as character references: the man in "hero.png" is the main
character (same face, tired salaryman look, white dress shirt, loosened navy tie), and the
young woman in the round avatar of "kouhai_notice.jpg" is his junior coworker Sato (same
face, brown hair in a bun, navy office jacket).
Horizontal 4:3. A casual smartphone group photo of 8 Japanese office coworkers at a
small, cozy yakitori izakaya at night: wooden counter and table, paper lanterns, plates of
yakitori skewers and edamame, mugs of beer. Everyone is squeezed into the frame, some
making peace signs. In the center sits a stern, balding middle-aged section chief with a
big laugh and his arm around the main character's shoulder; the main character is
squished right next to him, forcing a smile with completely dead, empty eyes. Sato is at
the far right edge of the group, smiling normally with a peace sign, clearly just one of
the group — nothing romantic. Slightly tilted framing and warm flash lighting like a real
phone photo.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
warm cheerful colors, comedic. No text, no letters, no signs with writing, no watermark.
```

---

## 11. スーパー夫婦大戦（ロボット大戦風フィナーレ）— Gemini 用

暴言を4種送ったあとのフィナーレのひとつ。90年代のロボットSRPGの戦闘シーン風に、
ロボット大戦と同じく味方（主人公）は右側から左へ攻撃し、敵（妻の巨大な機体）は左側。下のメッセージ欄にパイロットの顔が出る。
機体の向きが逆に生成されても、取り込むときに左右反転すればよい（robot_hero.png は反転して左向きにしてある）。
置いていない絵は、機体は四角＋名前、顔は既存の `hero.png` / `wife_angry.jpg`、背景は `bg_town.jpg` で代用される。

| ファイル | 用途 | 添付する見本 |
|---|---|---|
| `bg_battle.jpg` | 戦闘の背景（縦 9:16） | `bg_town.jpg` |
| `robot_hero.png` | 主人公の機体「サラリーマンガーZ」（画面右に置くので左向き・白背景） | `hero.png` |
| `robot_wife.png` | 妻の機体「グレートワイフ」（画面左に置くので右向き・白背景） | `wife_demon.jpg` |
| `pilot_hero.png` | メッセージ欄の主人公の顔（正方形） | `hero.png` |
| `pilot_wife.png` | メッセージ欄の妻の顔（正方形） | `wife_suspicious.png` |

機体と顔は白背景で作れば、こちらで切り抜く。**文字は入れない**。

### 11-1. bg_battle.jpg（添付: bg_town.jpg）
```
Vertical 9:16. A battle backdrop for a 1990s-style Japanese mecha strategy RPG battle
scene, side view: a Japanese residential city at night seen from rooftop height, a long
row of apartment buildings and power lines forming a horizontal skyline across the
middle, a wide empty open sky above with a few stars and a large full moon, a flat
ground band in the lower half. Simple, clean, slightly retro 16-bit-inspired painted look
with soft depth. No characters, no robots, no text, no letters, no watermark.
```

### 11-2. robot_hero.png（添付: hero.png）
```
A super-deformed (SD, chibi proportions, big head) giant robot in the style of 1990s
Japanese mecha strategy RPG battle sprites, full body, side view facing RIGHT, standing
in a heroic but slightly pathetic pose. The robot is themed after the tired salaryman in
the attached image: white dress-shirt-colored armor, a navy necktie hanging from its
chest plate, a briefcase used as a shield, a visor with tired droopy eyes, small dented
shoulder plates, a tiny exhaust puffing a sigh. Mostly gray, white and navy.
Plain pure white background, nothing else in the frame.
Clean bold black outlines, flat cel shading. No text, no letters, no logos, no watermark.
```

### 11-3. robot_wife.png（添付: wife_demon.jpg）
```
A super-deformed (SD, chibi proportions) but HUGE, overwhelmingly powerful giant robot in
the style of 1990s Japanese mecha strategy RPG battle sprites, full body, side view facing
LEFT, towering and confident. The robot is themed after the woman in the attached image:
a short dark bob-hair-shaped helmet with two curved horns, glowing pink eyes, armor shaped
like a floral apron in crimson and cream with pink flower patterns, a giant ladle as a
weapon in one hand, a household account book shaped shield, a big chest core glowing with
pink energy, a flowing cape. Much bigger and more imposing than a normal robot.
Plain pure white background, nothing else in the frame.
Clean bold black outlines, flat cel shading, vivid colors. No text, no letters, no logos, no watermark.
```

### 11-4. pilot_hero.png（添付: hero.png）
```
Square 1:1. A pilot face portrait for the message window of a 1990s Japanese mecha
strategy RPG: the man from the attached image (same face, short black hair, white dress
shirt, loosened navy tie), bust shot facing slightly right, wearing a simple pilot headset,
determined shouting expression with a drop of sweat, as if yelling an attack name.
Plain pure white background.
Japanese anime-style, clean bold black outlines, flat cel shading. No text, no watermark.
```

### 11-5. pilot_wife.png（添付: wife_suspicious.png）
```
Square 1:1. A pilot face portrait for the message window of a 1990s Japanese mecha
strategy RPG: the woman from the attached image (same face, short dark bob hair, floral
apron collar visible), bust shot facing slightly left, wearing a simple pilot headset,
calm cold confident smile with eyes glinting, as if about to unleash a finishing move.
Plain pure white background.
Japanese anime-style, clean bold black outlines, flat cel shading. No text, no watermark.
```

---

## 12. 写真集（アイコンの作り直し ＋ 付箋のページ）— Gemini 用

「隠していた水着グラビア写真集が見つかった」日の絵。どちらも**成人女性が明るいビーチで笑顔、性的なポーズはなし**の健全なグラビア風にする。

| ファイル | 用途 | 添付する見本 |
|---|---|---|
| `item_gravure_book.png` | 持ち物アイコン兼、玄関マットの上の写真集（作り直し。表紙で水着の写真集だとわかるように） | 今の `item_gravure_book.png`（絵柄合わせ） |
| `gravure_page.jpg` | 拾ったときに開く「付箋のページ」（横 4:3） | 新しい `item_gravure_book.png`（表紙の女性と同じ人にするため） |

### 12-1. item_gravure_book.png（添付: 今の item_gravure_book.png）
```
A single game item icon: a closed glossy photo book lying slightly tilted, in the same
art style as the attached icon. The front cover is a bright summer gravure photo: a
smiling adult Japanese woman in her twenties wearing a simple bikini, standing on a
sunny beach with blue sea, a parasol and a straw hat, waving cheerfully. Tasteful,
wholesome swimsuit photo, no suggestive pose. The cover title area is a plain colored
band with no letters. Plain pure white background, nothing else in the frame.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
simple and readable at small size. No text, no letters, no watermark.
```

### 12-2. gravure_page.jpg（添付: 新しい item_gravure_book.png）
```
Horizontal 4:3. Close-up of the photo book from the attached image lying open on a worn
doormat at a Japanese apartment entrance at night, seen from above. The right page is a
full-page photo of the same smiling adult woman in a simple bikini, sitting on a beach
towel under a parasol, smiling warmly at the camera with a peace sign. Tasteful and
wholesome, no suggestive pose. The left page has a smaller photo of the sea and sky.
A bright yellow sticky note is stuck on the top edge of the right page, sticking out
like a bookmark (blank, no writing). Soft cool light from the entrance lamp.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
comedic. No text, no letters, no watermark.
```

---

## 13. 料理本『サルでも出来る簡単レシピ』（item_saru_recipe.png）— Gemini 用

メシマズでバズった日にコンビニで買える「火に油」アイテムのアイコン。無ければ四角＋ラベルで表示される。

| ファイル | 用途 | 添付する見本 |
|---|---|---|
| `item_saru_recipe.png` | 持ち物アイコン（白背景で作れば、こちらで切り抜く） | `item_snack_box.png`（絵柄合わせ） |

```
A single game item icon in the same art style as the attached icon: a thin, cheap-looking
paperback cookbook standing slightly tilted. The bright yellow cover shows a cute cartoon
monkey wearing a white chef's hat and a little apron, proudly holding up a frying pan with
a perfect fried egg, with a big confident grin. A blank orange band runs across the top
of the cover where the title would be (no letters). A small promotional sash wraps the
bottom of the book (also blank). Plain pure white background, nothing else in the frame.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
simple and readable at small size, comedic. No text, no letters, no watermark.
```

---

## 14. 酔った勢いの悪ふざけの結末（3枚）— Gemini 用

缶ビール2本以上で送れる「妻を心配させる嘘」の結末。送った文面ごとに1枚。どれも縦 9:16、文字なし。
置くまでは既存の妻の絵で代用される。

| ファイル | 結末 | 添付する見本 |
|---|---|---|
| `prank_police.jpg` | 交通事故の嘘 → 捜索願（妻がおまわりさんを連れて帰ってくる） | `wife_dark.png` |
| `prank_mummy.jpg` | 階段の嘘 → 全治3か月（包帯でぐるぐる巻きの主人公と、笑顔の妻） | `wife_smile.png` と `hero.png` |
| `prank_tears.jpg` | 胸が苦しいの嘘 → 本気泣き（リビングで泣いている妻） | `wife_dark.png` |

### 14-1. prank_police.jpg（添付: wife_dark.png）
```
Use the attached image as the character reference for the wife (same face, short dark bob
hair). Vertical 9:16, viewpoint of a husband standing at his own apartment front door at
night, the door just opened from outside. In the doorway stands the wife in pajamas and
mismatched sandals, hair messy, phone clutched in her hand, eyes red from worry, staring at
the viewer with an exhausted, furious, silent glare. Next to her stands a polite young
Japanese police officer in uniform, holding a clipboard, smiling awkwardly. Cool night
light from the corridor lamp. Comedic but tense mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no badges with writing, no watermark.
```

### 14-2. prank_mummy.jpg（添付: wife_smile.png, hero.png）
```
Use the attached images as character references: the woman is the wife (same face, short
dark bob hair, floral apron) and the man is the husband. Vertical 9:16. A Japanese
apartment entrance hallway at night. The husband is completely wrapped in white bandages
from head to toe like a cartoon mummy, only his panicked eyes showing, sitting stiffly on
a rented home-care bed that has been set up right in the entrance hall. A pile of extra
bandage rolls and a pair of crutches lean nearby. The wife stands beside him with a sweet,
terrifying smile, tying the last bandage into a cute ribbon. Over-the-top comedic,
no injury or blood shown.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 14-3. prank_tears.jpg（添付: wife_dark.png）
```
Use the attached image as the character reference for the wife (same face, short dark bob
hair). Vertical 9:16. A small, dim Japanese apartment living room late at night, lit only
by one floor lamp. The wife sits curled up on the sofa in her pajamas, hugging her knees,
clutching her smartphone with both hands, quietly crying with tears on her cheeks and red
eyes, looking up toward the viewer at the doorway with relief and hurt at the same time.
A blanket half fallen to the floor, a cold cup of tea on the low table. Quiet, sincere,
emotional mood — not comedic.
Japanese manga-style digital illustration, clean bold black outlines, soft cel shading,
muted warm and blue colors. No text, no letters, no watermark.
```

## 15. 妻が酔っている日（4枚）— Gemini 用

1/10 の確率で妻が酔っ払っている日の画像。未配置の間は既存の画像（wife_angry / wife_smile / wife_dark など）で代用される。

### 15-1. wife_drunk_karami.jpg（添付: wife_suspicious.png）— からみ酒・逆魔王の怒り顔
```
Use the attached image as the character reference for the wife (same face, short dark bob
hair, floral apron). Vertical 9:16. A Japanese apartment entrance (genkan) at night, seen
from the doorway. The wife stands in the hallway clearly drunk: flushed red cheeks, half-
closed glaring eyes, swaying slightly, pointing an accusing finger at the viewer while
holding an open can of chuhai in the other hand. Her hair is a little messy and the apron
is crooked. Several empty cans lie on the floor behind her. Angry but comically
unreasonable mood, small cartoon "hic" bubbles (no letters) floating near her mouth.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 15-2. wife_drunk_amae.jpg（添付: wife_smile.png）— 甘え上戸・酔った妻のおかえり
```
Use the attached image as the character reference for the wife (same face, short dark bob
hair). Vertical 9:16. A Japanese apartment entrance at night, warm light. The wife has just
come back from a girls' night out and is very tipsy and clingy: bright red cheeks, sleepy
happy smile, arms stretched out toward the viewer asking for a hug, wearing a cute going-out
blouse with a cardigan slipping off one shoulder, handbag dropped on the floor. Small pink
hearts and sparkles float around her. Sweet, silly, affectionate mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 15-3. wife_drunk_sleep.jpg（添付: wife_smile.png）— 記憶リセット・玄関で寝落ち
```
Use the attached image as the character reference for the wife (same face, short dark bob
hair). Vertical 9:16. A Japanese apartment entrance at night, dim light from the hallway.
The wife has fallen asleep right on the entrance step (agarikamachi), curled up hugging a
large cushion, cheeks flushed from drinking, peaceful drooling smile, a blanket half on her.
An empty wine glass and a can lie next to her shoes. A small "Zzz"-like sleep bubble drawn
as symbols only (no letters). Quiet, comedic, relieved mood.
Japanese manga-style digital illustration, clean bold black outlines, soft cel shading.
No text, no letters, no watermark.
```

### 15-4. drunk_party.jpg（添付: wife_smile.png, hero.png）— 夫婦そろって酔っ払い・玄関で宴会
```
Use the attached images as character references: the woman is the wife (same face, short
dark bob hair) and the man is the husband in a loosened business suit and tie. Vertical
9:16. A Japanese apartment entrance at night turned into a party: the husband and the wife
sit together on the entrance floor, both drunk with red cheeks, laughing loudly with their
arms around each other's shoulders, clinking beer cans in a toast. The husband wears his
necktie around his head like a headband. Snacks, a convenience-store bag and many empty
cans scattered around. Confetti-like sparkles. Warm, chaotic, happy mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

## 16. スピリタスで病院送り（hospital_wife.jpg）— Gemini 用

未配置の間は wife_angry で代用される。

### 16-1. hospital_wife.jpg（添付: wife_angry.jpg, hero.png）
```
Use the attached images as character references: the woman is the wife (same face, short
dark bob hair) and the man is the husband. Vertical 9:16. A Japanese hospital emergency room
at night: white walls, a curtain partition, a heart monitor and an IV stand. The husband lies
in the hospital bed in a patient gown with an IV drip in his arm, pale and sweating, staring
at the ceiling in terror. The wife sits on a folding chair beside the bed with her arms
crossed, wearing a coat thrown over her pajamas, smiling calmly but with a dark shadow over
her eyes and a visible anger vein mark on her forehead — quietly furious. A tall bottle with
a plain label reading nothing (no text) stands on the bedside table like evidence.
Comedic but tense mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

## 17. 持ち物アイコン追加（牛乳・卵・カップ清酒・スピリタス）— Gemini 用

今は牛乳と卵が同じ買い物袋のアイコン（item_shopping_bag）、カップ清酒とスピリタスはアイコン無し（四角＋ラベル）。
1枚のシートに 2×2 で描かせて、こちらで切り出す。添付する見本: `item_beer.png`（絵柄合わせ）

```
A sprite sheet of 4 separate game item icons in the same art style as the attached icon,
arranged in a neat 2 columns x 2 rows grid on a plain pure white background. Each icon is a
single object, centered in its own cell, with plenty of white space between icons, nothing
touching or overlapping, no labels, no numbers, no frames.
Row 1, left to right:
1. a 1-liter Japanese milk carton with a gable top, white and light blue with a simple cow
   silhouette
2. a clear plastic pack of 6 white eggs (2 rows of 3), the kind sold at Japanese
   convenience stores
Row 2, left to right:
3. a Japanese one-cup sake: a small glass cup filled to the brim with clear sake, a metal
   pull-tab lid peeled halfway back, a plain red and white paper label with a small
   staggering bird motif
4. a tall slim clear glass bottle of extremely strong spirit with a plain white and red
   label, a small flame warning symbol and a skull-free danger stripe, faint wavy heat lines
   rising from the bottle to show it is dangerously strong
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
simple and readable at small size, consistent style across all icons.
No text, no letters, no numbers, no watermark.
```
→ 順番に `item_milk / item_eggs / item_cup_sake / item_spirytus` として切り出す。

## 18. 脱いだ格好で出歩いた結末（4枚）— Gemini 用

どれも縦 9:16、文字なし。置くまでは既存の背景・妻の絵で代用される。

| ファイル | 場面 | 添付する見本 |
|---|---|---|
| `police_patrol.jpg` | 肌着で公園 / コンビニで通報 → 懐中電灯を向けるお巡りさん | `bg_bench.jpg`（絵柄・背景合わせ） |
| `ol_scream.jpg` | パンツ一丁で夜の街 → 悲鳴をあげる OL | `bg_town.jpg`（絵柄・背景合わせ） |
| `koban_wife.jpg` | 交番に迎えに来た妻に怒られる | `wife_angry.jpg` と `hero.png` |
| `jail_cell.jpg` | 留置場で一泊 | `hero.png` |

### 18-1. police_patrol.jpg（添付: bg_bench.jpg）
```
Use the attached image as the style and location reference. Vertical 9:16. A small Japanese
neighborhood park at night, seen from the point of view of a man sitting on the bench.
A friendly but suspicious middle-aged Japanese police officer in a standard dark navy uniform
and cap (no readable text or numbers on the badge) leans in toward the viewer, shining a
flashlight directly at the viewer with a bright glare. His other hand is raised in a calm
"excuse me" gesture, with a polite but very doubtful expression. A white police bicycle is
parked behind him under a street lamp. Comedic, slightly tense mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 18-2. ol_scream.jpg（添付: bg_town.jpg）
```
Use the attached image as the style and location reference. Vertical 9:16. A Japanese
shopping street at night, seen from the point of view of the viewer who has just turned a
corner. A young office lady in a beige trench coat over a business suit, with a shoulder bag
and a convenience-store bag, freezes in shock and screams with her mouth wide open, eyes
wide, one hand covering her eyes and the other already holding up her smartphone to call
for help. Dramatic comedic shock lines radiate behind her and her bag is dropping from her
hand. Only she is shown; the viewer is off-frame. Over-the-top comedic surprise, nothing
indecent shown.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 18-3. koban_wife.jpg（添付: wife_angry.jpg, hero.png）
```
Use the attached images as character references: the woman is the wife (same face, short
dark bob hair) and the man is the husband. Vertical 9:16. Inside a small Japanese police box
(koban) late at night: a simple desk, a wall map, fluorescent light. The husband sits shrunk
on a folding chair in just a white undershirt and suit trousers, holding his head down in
shame. The wife, wearing a coat thrown over her pajamas, bows politely toward a police officer
on the right while turning her face toward her husband with a terrifying sideways glare,
dark shadow over her eyes and an anger vein mark on her forehead. The officer looks awkward
and sympathetic. Comedic but tense mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 18-4. jail_cell.jpg（添付: hero.png）
```
Use the attached image as the character reference for the husband (same face and hair).
Vertical 9:16. A Japanese police detention cell at night seen through the iron bars: a bare
concrete floor, a thin folded futon, a small high window with moonlight, a clock outside the
bars showing about three o'clock. The husband sits on the floor hugging his knees, wrapped
in a gray standard-issue blanket up to his shoulders, looking hollow-eyed and deeply
regretful. A single tear and sweat drops. Comedic yet pitiful mood, nothing indecent shown.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
cold blue-gray colors. No text, no letters, no numbers, no watermark.
```

### 18-5. police_konbini.jpg（添付: bg_konbini.png, police_patrol.jpg）
コンビニで3回断られて通報されたときの絵。置くまでは bg_konbini で代用される。
```
Use the first attached image as the style and location reference (the convenience store
interior) and the second as the character reference for the police officer (same face,
uniform and cap). Vertical 9:16. Inside a brightly lit Japanese convenience store late at
night, seen from the point of view of a customer standing near the register. The automatic
glass door behind has just slid open and the police officer steps in, looking straight at
the viewer with a calm but very doubtful expression, one hand raised in a polite "excuse me"
gesture. Behind the register on the side, a young store clerk in a striped uniform points
nervously toward the viewer while holding a phone receiver. A basket with milk and eggs sits
abandoned on the floor. Comedic, slightly tense mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no logos, no watermark.
```

### 18-6. jail_visit.jpg（添付: wife_dark.png, hero.png）
留置場の翌朝、面会室で妻と向かい合う絵。置くまでは wife_dark で代用される。
```
Use the attached images as character references: the woman is the wife (same face, short
dark bob hair) and the man is the husband. Vertical 9:16. A Japanese police station
visiting room in the morning, seen from the husband's side: a thick clear acrylic partition
with a small circle of speaking holes divides the narrow room. On the far side the wife sits
upright on a plain chair in a neat coat, perfectly calm, with a cold faint smile and a dark
shadow over her eyes. On the counter in front of her lie a neatly folded pair of suit
trousers and a large brown envelope. In the foreground, the back of the husband's head and
shoulders wrapped in a gray blanket, slumped. Cold fluorescent light. Quietly terrifying,
comedic mood.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
cool gray colors. No text, no letters, no watermark.
```

## 19. 新しい異変（余興の衣装・加工ツーショット）— Gemini 用

置くまでは文字だけで表示される（チャットの写真は本文のみ）。

| ファイル | 場面 | 添付する見本 |
|---|---|---|
| `costume_dress.jpg` | 廊下の物干しに干された、ピンクのアイドル衣装（手がかり・横 4:3） | `bg_door.jpg`（絵柄合わせ） |
| `yokyou_photo.jpg` | 余興の練習写真（チャットで送る写真・横 4:3） | `hero.png` |
| `twoshot_edited.jpg` | 加工アプリで女の子にされた同僚とのツーショット（通知・縦 3:4） | `hero.png` |
| `twoshot_original.jpg` | 加工前のツーショット（チャットで送る写真・縦 3:4） | `hero.png` と、できた `twoshot_edited.jpg` |

### 19-1. costume_dress.jpg（添付: bg_door.jpg）
```
Use the attached image as the style reference. Horizontal 4:3. A narrow Japanese apartment
hallway at night. On a small indoor drying rack hangs a frilly bright pink idol-style stage
costume dress with big ribbons, puffy sleeves and a layered skirt — clearly far too large,
an extra-large adult size — next to ordinary men's shirts and socks. A pair of sparkly pink
knee socks dangles beside it. The scene is lit by a single ceiling light, slightly
suspicious mood. Japanese manga-style digital illustration, clean bold black outlines, flat
cel shading. No text, no letters, no watermark.
```

### 19-2. yokyou_photo.jpg（添付: hero.png）
```
Use the attached image as the character reference for the husband (same face and hair).
Horizontal 4:3, a casual smartphone photo. Inside a Japanese karaoke room with a big screen
and a tambourine on the table, three middle-aged office workers practice an idol dance for
a year-end party: the husband in the center wears the frilly bright pink idol costume dress
over his work clothes, striking a cute pose with a wink and a peace sign; on the left a
bald, round section chief in a matching light blue idol dress poses enthusiastically; on
the right a slim young male coworker in a yellow idol dress looks embarrassed. All three are
clearly men, hilarious and wholesome. Japanese manga-style digital illustration, clean bold
black outlines, flat cel shading. No text, no letters, no watermark.
```

### 19-3. twoshot_edited.jpg（添付: hero.png）
```
Use the attached image as the character reference for the husband (same face and hair).
Vertical 3:4, a selfie-style photo taken at a Japanese izakaya. The husband, slightly drunk
and smiling, has his arm around the shoulders of a cute young woman with big sparkly eyes,
long glossy hair, pink cheeks and a soft smile, both making peace signs. The photo is
covered with beauty-filter effects: soft pink glow, sparkles, heart stickers and cat-ear
decorations on her. It should look like a suspicious couple photo at first glance.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 19-4. twoshot_original.jpg（添付: hero.png, twoshot_edited.jpg）
```
Use the attached images as references: this is the SAME photo as the second attached image,
the same pose, angle, izakaya background and composition, but WITHOUT any beauty filter.
The husband is the same. The "cute woman" is revealed to be his male coworker: a stocky
middle-aged Japanese man with short hair, a five-o'clock shadow, a loosened necktie and a
big cheerful grin, making the same peace sign with his arm on the same spot. No sparkles,
no hearts, no cat ears, plain lighting, slightly blurry like a real phone photo. Comedic
before/after contrast. Japanese manga-style digital illustration, clean bold black outlines,
flat cel shading. No text, no letters, no watermark.
```

### 19-5. item_dinner_reservation.png（添付: item_spa_ticket.png）
週末のダブルブッキングの日に通販で入れる「ペアディナー予約」の持ち物アイコン。白背景で作れば、こちらで切り抜く。
```
A single game item icon in the same art style as the attached icon: an elegant restaurant
dinner reservation voucher card for two, cream colored with a gold border, decorated with a
small illustration of crossed fork and knife, a plate of pasta and two clinking wine glasses,
tucked half inside a dark red envelope with a small wax seal. Plain pure white background,
nothing else in the frame. Japanese manga-style digital illustration, clean bold black
outlines, flat cel shading, simple and readable at small size.
No text, no letters, no numbers, no watermark.
```

## 20. ノートパソコン（item_laptop.png）— Gemini 用

「そろそろパソコンほしいな」の日にポチッとマートで買える「ポチPC Air 14」の持ち物アイコン。白背景で作れば、こちらで切り抜く。
添付する見本: `item_spa_ticket.png`（絵柄合わせ）

```
A single game item icon in the same art style as the attached icon: a sleek, thin, modern
silver laptop computer, opened at about 110 degrees and seen from a slight three-quarter
front angle. The screen glows with a simple bright blue abstract wallpaper. A small plain
price tag on a string hangs from the corner of the screen, blank with no numbers. A few
sparkles around it make it look brand new and tempting. Plain pure white background, nothing
else in the frame. Japanese manga-style digital illustration, clean bold black outlines, flat
cel shading, simple and readable at small size.
No text, no letters, no numbers, no logos, no watermark.
```

## 21. 甘え上戸の妻のぷんぷん顔 ＋ 鬼のお面 — Gemini 用

| ファイル | 場面 | 添付する見本 |
|---|---|---|
| `wife_drunk_pout.jpg` | 甘え上戸の妻に、おねだりのアイスを買い忘れて怒られる（縦 9:16） | `wife_drunk_amae.jpg` |
| `item_oni_mask.png` | コンビニの「鬼のお面」の持ち物アイコン（白背景で作れば切り抜く） | `item_spa_ticket.png` |

### 21-1. wife_drunk_pout.jpg（添付: wife_drunk_amae.jpg）
```
Use the attached image as the character and style reference: the same wife (same face,
short dark bob hair, same going-out blouse and cardigan) in the same Japanese apartment
entrance at night with warm light. Vertical 9:16. She is still very tipsy with bright red
cheeks, but now she is cutely angry: puffed-out cheeks in an exaggerated pout, eyebrows
drawn together, teary sparkling eyes glaring up at the viewer, both small fists raised up
near her chin and one foot stamping the floor like a sulking child. A small cartoon anger
vein mark and a little puff of steam above her head, plus a few floating hearts that have
turned into broken hearts. Cute and comedic, not scary at all.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading.
No text, no letters, no watermark.
```

### 21-2. item_oni_mask.png（添付: item_spa_ticket.png）
```
A single game item icon in the same art style as the attached icon: a cheap plastic
Japanese setsubun red oni (demon) mask sold at convenience stores, with two small yellow
horns, bushy black eyebrows, big round angry eyes, a wide grinning mouth with two little
fangs, and a thin white elastic string looped around it. A small plain price sticker on the
corner, blank with no numbers. Plain pure white background, nothing else in the frame.
Japanese manga-style digital illustration, clean bold black outlines, flat cel shading,
simple and readable at small size, comedic.
No text, no letters, no numbers, no watermark.
```

---

## 置いたあとの確認

1. `npm run dev` で起動
2. `?debug&scenario=anniversary_forgot`（キャンドル）、`?debug&scenario=tv_interview`（テレビの光・取材画面）
   のようにシナリオを固定すると、その画像が出る場面にすぐ行ける
3. 窓のオーバーレイがずれる場合は `src/ui/renderer.ts` の `OVERLAY_RECTS` で位置を調整する
