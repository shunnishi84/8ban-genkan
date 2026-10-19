# 8番玄関

「8番出口」パロディの“異変探し”ゲーム。
飲み会帰りのサラリーマンが玄関前で異変を見つけ、妻を怒らせる火種をすべて消してからドアを開ける。
火種が残ったまま開けると、鬼の形相の妻が待っている。8日連続で無事に帰宅できたらクリア。

* TypeScript + Vite / HTML5 Canvas + DOM（ランタイム依存なし）
* スマホ縦画面（9:16）優先。PC ブラウザでも中央に縦長で表示
* セーブは localStorage に最高連続記録のみ

設計（ディレクトリ構成・状態遷移・データ型）は [docs/DESIGN.md](docs/DESIGN.md) を参照。

## 起動方法

```bash
cd 8ban-genkan
npm install
npm run dev        # 開発サーバ（http://localhost:5173）
npm test           # Vitest（シナリオ整合性テスト含む）
npm run build      # 型チェック + 静的ビルド → dist/
npm run preview    # ビルド結果の確認
```

`dist/` はそのまま任意の静的ホスティングに置ける（`base: './'` なのでサブディレクトリでも可）。

### Android アプリ（Capacitor）

Web 版をそのまま Android アプリに同梱している（`capacitor.config.ts`、`android/`）。
アプリ ID は `com.shunnishi.hachibangenkan`。

**APK の入手（おすすめ）**: `8ban-genkan/` を変更してプッシュすると、GitHub Actions
（`.github/workflows/android-8ban-genkan.yml`）が APK を作る。Actions の実行結果ページの
「Artifacts」から zip をダウンロードし、中の APK をスマホで開いてインストールする
（初回は「提供元不明のアプリ」の許可が必要）。手動で動かすときは Actions 画面の「Run workflow」。

**手元でビルドする場合**（Android Studio / Android SDK と JDK 21 が必要）:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/app-debug.apk
```

* 署名は `android/app/sideload.keystore`（個人のスマホに入れる用）で固定している。どこでビルドしても
  同じ鍵なので、新しい APK を上書きインストールでき、最高記録も消えない。
  **Play ストアに出すときはこの鍵を使わず、本番用の鍵を別に作ること。**
* アイコンと起動画面の元絵は `resources/`。差し替えたら
  `npx @capacitor/assets generate --android --assetPath resources` で各解像度を作り直す。
* 端末の「戻る」ボタン: 開いている画面を閉じる → 店から街へ出る → プレイ中はタイトルに戻るか確認 → タイトルではアプリ終了。

### デバッグ

* `?debug` … その日のシナリオ・未解消の原因・解答例を画面上部に表示
* `?debug&scenario=cabaret_lipstick,garbage_forgot` … 1日目のシナリオを固定（カンマ区切りで複数合成）

## 遊び方

1. 玄関前のドア・廊下・窓・表札・足元をタップして調べる（初回 1 分）
2. 持ち物（鞄 / ワイシャツ / 財布 / 名刺入れ）とスマホ（チャット / カレンダー / メモ / ポチッとマート）を確認
3. 「引き返す」で街へ。コンビニ・ゴミ捨て場・ベンチ（通販）で対処
4. 火種をすべて消したら「ドアを開ける」

* 午前 1:00 を過ぎたら原因に関係なくゲームオーバー
* 通販の特急便は 23:59 までの注文で翌朝着。過ぎると明後日着で意味がない
* 関係ない謝罪チャットを送ると妻から電話で問い詰められ、8 分失う
* 異変なしの日に引き返すと、時間だけが過ぎる

## シナリオの追加方法

`src/data/scenarios.ts` の `SCENARIOS` 配列に 1 件足すだけで抽選対象になる。

```ts
{
  id: 'forgot_cat_food',
  title: '猫のごはんを買い忘れた',
  causes: [
    {
      id: 'forgot_cat_food',
      title: '猫缶忘れ',
      // フラグ条件式。{ all: [...] } / { any: [...] } を入れ子にできる
      resolution: { all: ['bought:cat_food', 'chat:cat_food'] },
      angerLines: ['タマのごはんは？', 'タマがあなたの靴で爪とぎしてるよ。'],
      successLine: 'タマ〜、パパがごはん買ってきたよ〜',
    },
  ],
  clues: [
    { at: 'app:memo', cause: 'forgot_cat_food', text: '猫缶（まぐろ味）×3' },
    { at: 'spot:door', cause: 'forgot_cat_food', text: 'ドアの向こうでタマが鳴いている。' },
    { at: 'spot:floor', text: '足元に猫の毛が……いつものことだ。' }, // cause 無し = ニセ異変
  ],
}
```

必要に応じて以下も足す:

| 追加先 | 内容 |
|---|---|
| `src/data/items.ts` | 新しい商品（`source: 'konbini' \| 'mail' \| 'none'`）。`useLabel` を付けると持ち物画面で「使う」ボタンが出る。`useRequires` / `useResult` で「接着剤 → 割れたマグカップを直す」のような組み合わせも作れる |
| `src/data/chat.ts` | 新しい定型文。`requires` で送信条件（例: 注文済み）を付けられる。`onlyWith` はその原因がある日だけ出す定型文、`provokeLines` を付けると「余計なひと言」（送ると火種を消していても怒られる） |
| `src/assets/manifest.ts` | 玄関前の見た目を変えるオーバーレイ（`visuals`）や手がかりのイラスト（`image`） |

使える仕掛け: `startItems`（最初から持っている物）、`pickups`（玄関前で拾える物）、
`unsendable`（0:00 の既読前、かつ他のメッセージを送る前なら送信取消できる誤爆メッセージ）、`homeAlone`（妻が不在の日）、
`startOrders`（キャンセルが必要な既存注文）、`hiddenWhen`（対処したら消える描写）、
`conflictsWith`（同じ日に組み合わせないシナリオ）、`unread`（チャットの未読表示）。
`chatReplies`（「今から帰るね」「ほんとにごめん…」などへの、その日の状況に合わせた妻の返事。`*` は話をそらしたとき、`<定型文ID>:after` は火種を消したあと）。

チャットの手がかりは本文の末尾に `（HH:MM）` か `（昨日）` を付ける。複数の火種が重なった日でも時刻順に並ぶ（テストで付け忘れを検出する）。

追加したら **`npm test`** を実行する。テストが以下を自動で確認する:

* 参照しているアイテム・定型文・画像が存在するか
* 各原因に手がかり・怒りセリフがあるか
* 解消に必要なフラグがすべて入手可能か（解消不可能な原因が無いか）
* 最終日のいちばん遅い開始時刻から、3 つ重なった組み合わせでも時間内に解けるか
* 8 日間、同じ周回でシナリオを重複させずに回せるか

## アセット一覧

ファイル名は `src/assets/manifest.ts` で一元管理。置けば自動で使われ、無ければ代替表示になる。

### 画像（`public/assets/images/`）

✅ = 同梱済み（提供イラストシートから切り出し）、— = 未作成（仮の四角＋ラベルで表示）

未作成の画像を生成するためのプロンプトは [docs/IMAGE_PROMPTS.md](docs/IMAGE_PROMPTS.md) にまとめてある。

| ファイル | 用途 | 状態 |
|---|---|---|
| bg_door.png | 玄関前の一枚絵（224x367 基準。当たり判定は `renderer.ts` の `SPOT_RECTS`） | ✅ |
| bg_door_dark.png | N日目の幕間 | ✅ |
| bg_title.png | タイトル背景 | ✅ |
| hero.png | 主人公（タイトル・幕間） | ✅ |
| window_garland.png | 誕生日の飾り付け（窓に重ねる） | ✅ |
| window_candle.png | 結婚記念日のキャンドル（窓に重ねる） | ✅ |
| window_dark.png | 妻が帰省中で真っ暗な窓 | ✅ |
| window_tv.png | テレビの青い光（窓に重ねる） | ✅ |
| garbage_bag.png | 玄関脇のゴミ袋 | ✅ |
| wet_floor.png | 足元の水たまり | ✅ |
| door / window / nameplate / floor / hallway.png | 玄関前のパーツ差し替え（任意） | — |
| bg_town.jpg / bg_trash.jpg / bg_bench.jpg | 夜の街・ゴミ捨て場・公園のベンチ | ✅ |
| bg_konbini.png | コンビニ店内 | ✅ |
| wife_smile.png | おかえりの妻 | ✅ |
| wife_sullen.jpg | 渋々許す日の無表情の妻（Gemini で生成） | ✅ |
| wife_angry.png | 鬼の形相の妻（炎込み） | ✅ |
| wife_dark.png | 時間切れの無言の妻 | ✅ |
| wife_suspicious.png | ゲームオーバー画面の背景 | ✅ |
| wife_demon.jpg | 暴言を送った日の魔王化した妻（Gemini で生成） | ✅ |
| fire.png | 炎（wife_angry が無いときの代替演出用） | — |
| clear.jpg | クリア画面 | ✅ |
| shirt_clean.png / shirt_lipstick.png | 替えのシャツ / 口紅つきシャツ | ✅ |
| item_card.png / item_receipt.png | 店の名刺 / レシート | ✅ |
| item_bouquet.png / item_shopping_bag.png | 花束 / レジ袋（牛乳・卵） | ✅ |
| item_cake / ice_cream / glue / broken_mug / fixed_mug / onsen_ticket / golf_club / empty_can / ring / mint .png | 持ち物アイコン | ✅ |
| tv_capture.jpg | テレビ取材の画面（Gemini で生成、テロップの文字化けは上から描き直し） | ✅ |
| kouhai_notice.jpg | 後輩女子からの通知（Gemini で生成、文字化けした本文は上から描き直し） | ✅ |
| group_photo.jpg | 後輩チャットの日にチャットへ貼る飲み会の集合写真（Gemini で生成） | ✅ |
| bg_battle.jpg / robot_hero.png / robot_wife.png / pilot_hero.png / pilot_wife.png | スーパー夫婦大戦（ロボット大戦風フィナーレ）の背景・機体・顔（Gemini で生成。主人公の機体は左右反転） | ✅ |
| gravure_page.jpg | 写真集を拾ったときに開く付箋のページ（Gemini で生成） | ✅ |
| item_saru_recipe.png | メシマズの日の「火に油」アイテム、料理本のアイコン（Gemini で生成） | ✅ |
| prank_police.jpg / prank_mummy.jpg / prank_tears.jpg | 酔った勢いの悪ふざけの結末（無ければ既存の妻の絵で代用） | — |
| castle_gate.png | 魔王城フィナーレで玄関ドアに重ねる門（Gemini で生成） | ✅ |
| bg_court.jpg / bg_siege.jpg / bg_exposed.jpg | 家庭裁判（法廷全体）・家族会議・公開処刑のフィナーレ背景（Gemini で生成） | ✅ |
| bg_court_judge / defense / prosecutor / witness .jpg | 家庭裁判のカメラ切り替え（Gemini で生成。無ければ bg_court で代用） | ✅ |
| wife_demon_final.jpg | 魔王の最終形態（Gemini で生成、家計簿の英字は「家計簿」に描き直し） | ✅ |
| bg_lockout.jpg | 締め出しフィナーレの背景（Gemini で生成、張り紙の謎文字は「鍵を交換しました。」に描き直し） | ✅ |
| item_sweets / wine / konbini_pudding / navy_tie / detergent_generic / vinyl_umbrella / snack_box / beer .png | 持ち物アイコン（コンビニ。Gemini のシートから切り出し） | ✅ |
| item_detergent_refill / pair_glass / umbrella_same / limited_pudding / kashiori / spa_ticket / av_subscription / gravure_book .png | 持ち物アイコン（通販など。Gemini のシートから切り出し） | ✅ |

### 音声（`public/assets/audio/`）

すべて未作成。BGM は無音、SE は WebAudio のビープで代替される。

| ファイル | 用途 |
|---|---|
| bgm_title.mp3 / bgm_door.mp3 / bgm_town.mp3 | タイトル / 玄関前 / 街（ループ） |
| bgm_angry.mp3 / bgm_home.mp3 / bgm_clear.mp3 | 怒り / 帰宅成功 / クリア（ループ） |
| bgm_demon.mp3 / se_demon.mp3 | 魔王化（ループ）/ 魔王登場の効果音 |
| se_tap / se_open / se_send / se_buy / se_order / se_discard .mp3 | 操作音 |
| se_walk / se_phone_call / se_door / se_angry / se_success / se_late .mp3 | 移動・ドア・結末 |

BGM は最初のタップで解禁され（自動再生制限対策）、画面切替時はフェードで差し替わる。右上の 🔊 でミュート。
