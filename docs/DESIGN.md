# 8番玄関 設計メモ

## ディレクトリ構成

```
8ban-genkan/
├─ index.html
├─ vite.config.ts           # base: './'（静的ホスティング用）+ Vitest 設定
├─ public/assets/
│   ├─ images/              # 画像（無ければ仮の四角＋ラベル）
│   └─ audio/               # BGM / SE（無ければ BGM は無音、SE はビープ）
├─ src/
│   ├─ main.ts
│   ├─ style.css
│   ├─ assets/
│   │   ├─ manifest.ts      # 画像・音声ファイル名の一元管理
│   │   └─ loader.ts        # 画像の非同期読み込み（失敗時は null）
│   ├─ audio/AudioManager.ts# BGM ループ/切替/ミュート、自動再生制限対応
│   ├─ core/                # ★ DOM 非依存。Vitest で直接テストする
│   │   ├─ types.ts         # データ型
│   │   ├─ config.ts        # 時刻・所要時間・難易度のパラメータ
│   │   ├─ requirement.ts   # フラグ条件式の評価
│   │   ├─ engine.ts        # シナリオ抽選・行動・判定
│   │   ├─ solver.ts        # 自動解答（テストとデバッグ表示用）
│   │   ├─ rng.ts / save.ts
│   ├─ data/                # ★ データ追加だけでシナリオが増える
│   │   ├─ scenarios.ts     # シナリオ（原因・手がかり・怒りセリフ）
│   │   ├─ items.ts         # コンビニ・通販・シナリオ専用アイテム
│   │   ├─ chat.ts          # 送信できる定型文
│   │   └─ base.ts          # 「いつも通り」の描写
│   └─ ui/
│       ├─ game.ts          # 画面遷移と入力
│       ├─ renderer.ts      # Canvas 描画・当たり判定
│       └─ dom.ts           # 小さな DOM ビルダー
└─ tests/
    ├─ scenarios.test.ts    # シナリオ整合性（解消不可能な原因が無いか）
    └─ engine.test.ts       # 時計・締切・ペナルティ・周回
```

## 状態遷移

```
title ──はじめる──▶ intro(N日目) ──tap──▶ play
                                           │
   ┌───────────────────────────────────────┘
   │ play（location: door / town / konbini / trash / bench）
   │   door : 場所を調べる・持ち物・スマホ・引き返す・ドアを開ける
   │   town : コンビニ / ゴミ捨て場 / ベンチで通販 / 家に戻る
   │   行動ごとに時間経過 → 1:00 超過で即 late
   │
   ├─ ドアを開ける ─ 未解消の原因あり ─▶ talk(angry) ─▶ gameover ─▶ intro(1日目)
   ├─ ドアを開ける ─ 全解消/原因なし ─▶ talk(home) ─┬▶ intro(N+1日目)
   │                                                └▶ clear（8日連続）
   └─ 1:00 を過ぎた ────────────────▶ talk(angry, late) ─▶ gameover
```

## データ型（抜粋）

```ts
type Requirement = string | { all: Requirement[] } | { any: Requirement[] };

interface Cause {
  id: string; title: string;
  resolution: Requirement;   // 解消条件（フラグ式）
  angerLines: string[];      // 怒りシーンのセリフ
  successLine: string;       // 解消して帰宅したときの一言
}

interface Clue {
  at: 'spot:door' | 'slot:shirt' | 'app:chat' | 'notice' | ...;
  text: string;
  cause?: string;            // 省略 = ニセ異変
  unread?: boolean;          // チャットの未読
  image?: string;            // 添えるイラスト
  hiddenWhen?: Requirement;  // 対処したら描写が消える
}

interface Scenario {
  id: string; title: string;
  causes: Cause[];           // [] なら「異変なし」
  clues: Clue[];
  startItems?; pickups?; startOrders?; visuals?; conflictsWith?; successLine?;
}
```

### 判定

* 状態は `DayState.flags: Set<string>`（= resolvedFlags）。行動が `bought:milk` `ordered:bouquet` などのフラグを立てる
* ドアを開けた瞬間に `causes.filter(c => !evaluate(c.resolution, flags))` を見るだけ
* 時間切れ（> 25:00）は行動ごとに `perform()` が判定

### フラグ一覧

| フラグ | 立つ行動 |
|---|---|
| `bought:<item>` | コンビニで購入 |
| `ordered:<item>` | 通販を 23:59 までに注文（翌朝着） |
| `ordered_late:<item>` | 0:00 以降に注文（明後日着。解消にはならない） |
| `canceled:<item>` | 既存注文を 23:59 までにキャンセル |
| `discarded:<item>` | ゴミ捨て場で捨てる |
| `used:<item>` | 持ち物の「着替える」「指にはめる」等 |
| `picked:<item>` | 玄関前で拾う（ゴミ袋） |
| `unsent:<clue>` | 誤爆したチャットを 0:00 の既読前に送信取消 |
| `chat:<template>` | 定型文を送信 |

### 日ごとの抽選

* 1〜5日目: 25% で「異変なし」。それ以外は原因 1 つ
* 6〜7日目: 原因 2 つ、8日目: 原因 3 つ（シナリオを合成）
* 同じ周回で使ったシナリオは選ばない。`conflictsWith` の組み合わせは避ける
* 開始時刻: 22:50 + (日-1)×4分 + 0〜10分
