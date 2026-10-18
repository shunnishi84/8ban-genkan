import type { Clue } from '../core/types';

/**
 * 暴言を4種すべて送った日だけに起きる「フィナーレ」。7本からランダムで1本。
 * どれも流血・暴力の描写はしない（暗転や比喩で済ませる）。
 */
export type FinaleId = 'castle' | 'siege' | 'loop' | 'court' | 'lockout' | 'exposed' | 'robot';

export const FINALE_IDS: FinaleId[] = ['castle', 'siege', 'loop', 'court', 'lockout', 'exposed', 'robot'];

/** ロボット大戦風の戦闘の参加者 */
export interface BattleUnit {
  /** パイロット名（メッセージ欄の名札） */
  pilot: string;
  /** 機体名（HP 欄） */
  unit: string;
  hp: number;
}

/**
 * 戦闘の1コマ。タップで次へ。
 * anim: attack = 攻撃（ミサイル）、zero = ノーダメージ、charge = 力を溜める、
 * finisher = 必殺技（極太ビーム）、shotdown = 撃墜
 */
export interface BattleStep {
  speaker: 'hero' | 'wife' | 'narr';
  text: string;
  /** 大きく出す技名 */
  attackName?: string;
  anim?: 'attack' | 'zero' | 'charge' | 'finisher' | 'shotdown';
  /** この時点の HP（無ければ前のコマのまま） */
  heroHp?: number;
  wifeHp?: number;
  /** 被弾した側に出すダメージ数値 */
  damage?: { to: 'hero' | 'wife'; value: number };
  /** 映す機体（既定は話している側。ナレーションは妻）。攻撃のコマは自動で2カット */
  cam?: 'hero' | 'wife';
  /**
   * どちらの攻撃ターンか（既定は話している側）。背景のスクロール向きが決まる:
   * 主人公のターンは右から左、妻のターン（主人公が攻撃を受ける）は左から右
   */
  turn?: 'hero' | 'wife';
}

export interface FinaleLine {
  who: 'me' | 'wife' | 'narr' | 'other';
  /** who が other のときの名札（「義母」「裁判長（妻）」など） */
  name?: string;
  text: string;
  /** true のとき、送った暴言を「証拠」として1件ずつ大きなカードで見せる行に展開する */
  evidence?: boolean;
  /** この行を出すときの演出（家庭裁判の逆転裁判風エフェクトなど） */
  fx?: FinaleFx;
  /** 証言（緑の文字で出す） */
  testimony?: boolean;
}

/**
 * 演出の種類。
 * objection/holdit/takethat: 「異議あり！」「待った！」「くらえ！」の吹き出し、
 * testimony/crossexam: 「証言開始」「尋問開始」の帯、gavel: 木槌3連打、slam: 机バン、
 * penalty: 信頼度ゲージが削れる、shock: 衝撃の走るフラッシュ、guilty: 「有罪」の判決
 */
export type FinaleFx =
  | 'objection'
  | 'holdit'
  | 'takethat'
  | 'testimony'
  | 'crossexam'
  | 'gavel'
  | 'slam'
  | 'penalty'
  | 'shock'
  | 'guilty';

export interface FinaleChoice {
  label: string;
  /** 返しのパターン。選ぶたびにこの中からランダムで1つ */
  replies: FinaleLine[][];
  /** true ならこの選択で次へ進む。false なら返答のあと（相手の反撃を挟んで）同じ選択肢に戻る */
  end?: boolean;
}

/** 毎ターンの相手の反撃。damage だけ「こころのHP」が減る */
export interface FinaleCounter {
  lines: FinaleLine[];
  damage: number;
}

export interface Finale {
  id: FinaleId;
  /** ゲームオーバー画面の「原因」 */
  title: string;
  /** 背景（renderer の Scene）。demon は魔王の演出、loop は無限玄関ループ、それ以外は画像キー */
  scene: 'demon' | 'loop' | 'bg_court' | 'bg_siege' | 'bg_lockout' | 'bg_exposed' | 'bg_battle';
  /** ロボット大戦風の戦闘（intro のあとに流し、終わったら outro） */
  battle?: { hero: BattleUnit; wife: BattleUnit; steps: BattleStep[] };
  /** 4つ目の暴言を送った瞬間に出るメッセージ */
  onTrigger: string[];
  /** 送った瞬間にスマホが壊れて、以後スマホが使えなくなる */
  breaksPhone?: boolean;
  /** 送った瞬間に増える手がかり（通知の殺到など） */
  triggerClues?: Clue[];
  /**
   * 発動した瞬間に玄関前へ強制ワープし、以後は玄関前から動けない。
   * warp はワープしたときのメッセージ、blocked は引き返そうとしたときのメッセージ（順番に出す）
   */
  trap?: { warp: string[]; blocked: string[][] };
  /** 玄関前の見た目を変えるオーバーレイ（manifest のキー） */
  doorVisuals?: string[];
  /** 無限玄関ループ: ドアを開けるたびに出るメッセージ（この回数だけループする） */
  loop?: string[];
  intro: FinaleLine[];
  /**
   * 最終形態（缶ビールを3本飲んでから暴言を全部送った日）。intro・反撃・HP を差し替える。
   * 背景の魔王も赤黒い最終形態になる
   */
  finalForm?: { intro: FinaleLine[]; counters: FinaleCounter[]; hp: number; knockout: FinaleLine[] };
  choice?: {
    prompt: string;
    options: FinaleChoice[];
    /** 選ぶたびに相手が反撃してくる（ランダム）。無ければ反撃なし */
    counters?: FinaleCounter[];
    /** こころのHP。反撃で 0 になったら knockout を見せて先へ進む */
    hp?: number;
    knockout?: FinaleLine[];
    /** 見た目。rpg はドラクエ風のコマンド（既定）、court は逆転裁判風のボタンとゲージ */
    style?: 'rpg' | 'court';
    /** HP の呼び名（既定は「こころのHP」） */
    gauge?: string;
  };
  outro: FinaleLine[];
}

const judge = '裁判長（妻）';
const prosecutor = '検察官（義母）';
const gallery = '傍聴席（ご近所）';
const witness = '証人（妻）';

export const FINALES: Record<FinaleId, Finale> = {
  // A → C: スマホ爆散 → 魔王城で RPG
  castle: {
    id: 'castle',
    title: '魔王城',
    scene: 'demon',
    breaksPhone: true,
    onTrigger: ['バキッ！！ 画面に、ひびが走った。', '「この端末は、妻によってリモート初期化されました」'],
    doorVisuals: ['castle_gate'],
    trap: {
      warp: ['……視界が、ぐにゃりと歪んだ。', '気がつくと、玄関の前に立っていた。', 'ドアがあったはずの場所に、禍々しい門がそびえている。'],
      blocked: [
        ['見えない壁に弾かれた。', '……廊下に、紫色の結界が張られている。'],
        ['廊下を走った。……走っても走っても、門の前に戻ってくる。', '空間が、歪んでいる。'],
        ['エレベーターのボタンを押した。', '表示が「魔」で止まったまま、動かない。'],
        ['階段を駆け下りた。……降りた先は、また玄関の前だった。'],
        ['結界に「まおうからは にげられない！」と浮かび上がった。'],
      ],
    },
    intro: [
      { who: 'narr', text: '玄関のドアが、巨大な魔王城の門に変わっている。' },
      { who: 'narr', text: '表札には『魔王城』の三文字。' },
      { who: 'narr', text: 'ギギギ……と、門がひとりでに開いた。' },
      { who: 'narr', text: 'まおう　が　あらわれた！' },
    ],
    choice: {
      prompt: 'どうする？',
      hp: 100,
      options: [
        {
          label: 'たたかう',
          replies: [
            [{ who: 'narr', text: 'あなたの　こうげき！　……よわよわしすぎて　ダメージを　あたえられない！' }],
            [{ who: 'narr', text: 'あなたは　こぶしを　にぎった。……が、そっと　ひらいた。' }],
            [{ who: 'narr', text: 'あなたの　こうげき！　まおうは　あくびを　した。' }],
            [{ who: 'narr', text: 'かいしんの　いちげき！　……と　おもったら　ゆめだった。' }],
            [{ who: 'narr', text: 'あなたは　ネクタイを　ふりまわした！　じぶんの　かおに　あたった。' }],
          ],
        },
        {
          label: 'にげる',
          replies: [
            [{ who: 'wife', text: 'どこに逃げる気！？' }, { who: 'narr', text: 'まわりこまれてしまった！' }],
            [{ who: 'wife', text: '逃げられると思ってるの！？' }, { who: 'narr', text: 'あしが　すくんで　うごけない！' }],
            [{ who: 'narr', text: 'げんかんの　かぎは　まおうが　にぎっている！' }],
            [{ who: 'wife', text: '実家？ もう電話してあるわよ。' }, { who: 'narr', text: 'にげばしょは　なかった！' }],
            [{ who: 'wife', text: 'そっちは壁よ。' }, { who: 'narr', text: 'あなたは　かべに　ぶつかった。' }],
          ],
        },
        {
          label: 'どうぐ',
          replies: [
            [{ who: 'narr', text: 'スイーツは　すべて　まおうに　たべられている！' }],
            [{ who: 'narr', text: 'あなたは　スマホを　とりだした。……われていた。' }],
            [{ who: 'narr', text: 'あなたは　さいふを　ひらいた。こづかいは　のこっていなかった。' }],
            [{ who: 'narr', text: 'あなたは　けっこんゆびわを　かかげた！　まおうの　いかりが　2ばいに　なった！' }],
            [{ who: 'narr', text: 'あなたは　コンビニの　レシートを　みせた。まおうは　かけいぼに　きにゅうした。' }],
          ],
        },
        {
          label: 'どげざ',
          end: true,
          replies: [
            [
              { who: 'narr', text: 'あなたは　げんかんで　ふかぶかと　どげざした。' },
              { who: 'narr', text: 'まおうは　いちおう　みのがしてくれた……。' },
            ],
            [
              { who: 'narr', text: 'あなたは　ひたいを　げんかんマットに　こすりつけた。' },
              { who: 'wife', text: '……顔、上げなくていいから。' },
              { who: 'narr', text: 'まおうは　ためいきまじりに　みのがしてくれた……。' },
            ],
          ],
        },
      ],
      counters: [
        { damage: 25, lines: [{ who: 'narr', text: 'まおうの　こごと！' }, { who: 'wife', text: '何回言ったらわかるの？' }, { who: 'narr', text: 'こころに　25の　ダメージ！' }] },
        { damage: 15, lines: [{ who: 'narr', text: 'まおうは　きのうの　くつしたを　なげつけた！　15の　ダメージ！' }] },
        { damage: 20, lines: [{ who: 'narr', text: 'まおうは　ふかい　ためいきを　ついた。くうきが　おもくなった！　20の　ダメージ！' }] },
        { damage: 30, lines: [{ who: 'narr', text: 'まおうは　かけいぼを　ひらいた！　こづかいが　0に　なった！　30の　ダメージ！' }] },
        { damage: 35, lines: [{ who: 'narr', text: 'まおうは　ぼうげんの　スクショを　4まい　ならべた！　35の　ダメージ！' }] },
        { damage: 40, lines: [{ who: 'narr', text: 'まおうは　だまって　ほほえんだ。……いちばん　こわい！　40の　ダメージ！' }] },
        { damage: 20, lines: [{ who: 'wife', text: 'お義母さんに電話しようかしら。' }, { who: 'narr', text: 'まおうは　スマホを　ちらつかせた！　20の　ダメージ！' }] },
      ],
      knockout: [
        { who: 'narr', text: 'あなたの　こころは　おれた……。' },
        { who: 'narr', text: 'あなたは　げんかんで　しずかに　せいざした。' },
      ],
    },
    finalForm: {
      intro: [
        { who: 'narr', text: '門の向こうから、地鳴りのような気配がする。' },
        { who: 'narr', text: 'ギギギ……ガシャァァン！！ 門が、内側から吹き飛んだ。' },
        { who: 'wife', text: '……お酒のチカラを借りないと、何も言えないのね。' },
        { who: 'wife', text: '「おにーよめー！！」……全部、スクショしてあるから。' },
        { who: 'narr', text: 'まおうは　さいしゅうけいたいに　へんしんした！！' },
      ],
      hp: 100,
      counters: [
        { damage: 45, lines: [{ who: 'narr', text: 'まおうは　「よっぱらいの　ぼうげん」を　1つずつ　ろうどくした！　45の　ダメージ！' }] },
        { damage: 40, lines: [{ who: 'wife', text: '飲んだ缶、3本。レシートもあるわよ。' }, { who: 'narr', text: 'しょうこを　つきつけられた！　40の　ダメージ！' }] },
        { damage: 35, lines: [{ who: 'narr', text: 'まおうは　あしたの　あさの　「ふつかよい」を　よげんした！　35の　ダメージ！' }] },
        { damage: 50, lines: [{ who: 'narr', text: 'まおうの　さいしゅうおうぎ　「むごんの　せいざ　ようせい」！　50の　ダメージ！' }] },
        { damage: 30, lines: [{ who: 'wife', text: '休肝日、向こう1年ね。' }, { who: 'narr', text: 'れいぞうこの　ビールが　すべて　ふういんされた！　30の　ダメージ！' }] },
      ],
      knockout: [
        { who: 'narr', text: 'あなたの　こころは　こなごなに　くだけた……。' },
        { who: 'narr', text: 'よいも　いっしゅんで　さめた。' },
        { who: 'narr', text: 'あなたは　げんかんで　しずかに　せいざした。' },
      ],
    },
    outro: [{ who: 'wife', text: '……続きは、明日の朝にしましょうか。' }],
  },

  // D: 包囲網
  siege: {
    id: 'siege',
    title: '家族会議',
    scene: 'bg_siege',
    onTrigger: ['スマホが、鳴りやまない。'],
    triggerClues: [
      { at: 'notice', text: '📞 義母: 今から迎えに行きます' },
      { at: 'notice', text: '💬 義父: 話がある。' },
      { at: 'notice', text: '💬 妻の友達グループ「女子会♡」: スクショ回ってきたよ〜（4枚）' },
      { at: 'notice', text: '💬 課長: 明日、少し話せるか' },
      { at: 'app:calendar', text: '明朝 7:00 家族会議（出席: 妻・義父・義母・あなた）' },
    ],
    intro: [
      { who: 'narr', text: 'ドアを開けると、玄関に靴が4足、きっちり並んでいた。' },
      { who: 'other', name: '義母', text: 'あら、おかえりなさい。' },
      { who: 'other', name: '義父', text: '……座りなさい。' },
      { who: 'other', name: '妻の友達', text: 'あ、どうも〜（スマホを構えながら）' },
      { who: 'wife', text: '家族会議、前倒ししたの。' },
    ],
    outro: [{ who: 'narr', text: 'その夜、議題は4つあった。' }],
  },

  // E: 無限玄関ループ（8番出口オマージュ）
  loop: {
    id: 'loop',
    title: '無限玄関ループ',
    scene: 'loop',
    onTrigger: ['……時計が、4:44 で止まった。'],
    loop: [
      'ドアを開けた。……玄関前に立っていた。',
      'もう一度開けた。また玄関前だ。',
      '表札の文字が『魔』になっている。',
      '窓の向こうから、誰かがこちらを見ている。',
      '廊下の奥から「おかえり……」と聞こえる。',
      '「おかえり……おかえり……おかえり……」',
      '足元に、自分のものではない影がのびている。',
      '8回目。ドアが、開いた。',
    ],
    intro: [],
    outro: [
      { who: 'wife', text: 'おかえり。' },
      { who: 'wife', text: '8周、待ってたわ。' },
      { who: 'narr', text: 'あなたは、8番玄関から出られない。' },
    ],
  },

  // F: 家庭裁判
  court: {
    id: 'court',
    title: '家庭裁判',
    scene: 'bg_court',
    onTrigger: ['……どこかで、木槌の音がした気がする。'],
    intro: [
      { who: 'narr', text: 'ドアを開けると、そこは法廷だった。' },
      { who: 'other', name: judge, text: 'これより、被告人の家庭裁判を開廷します。', fx: 'gavel' },
      { who: 'other', name: prosecutor, text: '検察側、準備完了しております。' },
      { who: 'other', name: judge, text: '弁護側は？' },
      { who: 'me', text: '……弁護人が、いません。' },
      { who: 'other', name: judge, text: 'では被告人が自分で弁護しなさい。' },
      { who: 'other', name: prosecutor, text: '証拠を提出します。被告人が本日送信したメッセージ、4件です。', fx: 'slam' },
      { who: 'other', name: prosecutor, text: '', evidence: true },
      { who: 'other', name: gallery, text: 'ざわ……ざわ……' },
      { who: 'other', name: judge, text: '静粛に！', fx: 'gavel' },
      { who: 'other', name: judge, text: '続いて、証人の証言に移ります。証人は……私です。' },
      { who: 'narr', text: '裁判長は、すたすたと証人席へ移動した。' },
      { who: 'other', name: witness, text: 'では、証言します。', fx: 'testimony' },
      { who: 'other', name: witness, testimony: true, text: '夫は毎晩「今から帰る」と送ってきて、1時間後に帰ってきます。' },
      { who: 'other', name: witness, testimony: true, text: '今日は、私のことを「鬼嫁」「鬼軍曹」「母ちゃん」と呼びました。' },
      { who: 'other', name: witness, testimony: true, text: '私は、ただ夕飯を作って待っていただけです。' },
      { who: 'other', name: judge, text: '……では被告人、尋問を始めなさい。', fx: 'crossexam' },
    ],
    choice: {
      prompt: '証言のムジュンを突け！',
      style: 'court',
      gauge: '信頼度',
      hp: 100,
      options: [
        {
          label: 'ゆさぶる',
          replies: [
            [
              { who: 'me', text: '「ただ待っていただけ」……本当ですか？', fx: 'holdit' },
              { who: 'other', name: witness, testimony: true, text: 'ええ。あなたの分のハンバーグを、ゴミ箱の前で。' },
              { who: 'narr', text: '……墓穴を掘った。' },
            ],
            [
              { who: 'me', text: '「1時間後」というのは、さすがに大げさでは？', fx: 'holdit' },
              { who: 'other', name: witness, testimony: true, text: '先週の平均は1時間12分。全部記録してあります。', fx: 'shock' },
            ],
            [
              { who: 'me', text: 'その夕飯のメニューは、何でしたか？', fx: 'holdit' },
              { who: 'other', name: witness, testimony: true, text: 'あなたの好物の唐揚げ。……だったもの。' },
              { who: 'narr', text: '今は、もう冷たい。' },
            ],
          ],
        },
        {
          label: 'つきつける',
          replies: [
            [
              { who: 'me', text: 'これを見てください！', fx: 'takethat' },
              { who: 'narr', text: 'あなたは スマホの スクショを つきつけた。' },
              { who: 'other', name: judge, text: '……これは、被告人が送った暴言では？' },
              { who: 'other', name: prosecutor, text: '自ら証拠を追加してくださるなんて。', fx: 'slam' },
            ],
            [
              { who: 'me', text: 'この結婚指輪が、僕の愛の証拠です！', fx: 'takethat' },
              { who: 'other', name: witness, testimony: true, text: '……それ、先月「なくした」って言ってたやつよね？', fx: 'shock' },
            ],
            [
              { who: 'me', text: '僕の給与明細です！ 毎日頑張って働いています！', fx: 'takethat' },
              { who: 'other', name: prosecutor, text: 'お小遣いの使い道、ちょうど伺いたかったところです。', fx: 'slam' },
            ],
          ],
        },
        {
          label: '異議あり！',
          replies: [
            [
              { who: 'me', text: '証人の証言は、感情的すぎます！', fx: 'objection' },
              { who: 'other', name: prosecutor, text: '誰のせいで感情的になったと？', fx: 'objection' },
              { who: 'other', name: judge, text: '検察側の異議を認めます。' },
            ],
            [
              { who: 'me', text: '「鬼軍曹」は……愛称です！', fx: 'objection' },
              { who: 'other', name: witness, testimony: true, text: 'へえ。じゃあ明日からあなたは「二等兵」ね。' },
            ],
            [
              { who: 'me', text: '…………。', fx: 'objection' },
              { who: 'other', name: judge, text: '……で、続きは？' },
              { who: 'me', text: '……ありません。' },
            ],
          ],
        },
        {
          label: '土下座',
          replies: [
            [
              { who: 'narr', text: 'あなたは 法廷の床に 額をこすりつけた。' },
              { who: 'other', name: judge, text: 'それは玄関でもう見飽きました。' },
            ],
            [
              { who: 'narr', text: 'あなたは 土下座した。' },
              { who: 'other', name: gallery, text: '（ひそひそ……また土下座よ……）' },
            ],
          ],
        },
      ],
      counters: [
        { damage: 25, lines: [{ who: 'other', name: judge, text: '被告人の主張には、根拠がありません！', fx: 'penalty' }] },
        {
          damage: 30,
          lines: [
            { who: 'other', name: prosecutor, text: 'やれやれ……裁判長、これ以上は時間の無駄かと。', fx: 'slam' },
            { who: 'other', name: judge, text: 'ペナルティです！', fx: 'penalty' },
          ],
        },
        { damage: 20, lines: [{ who: 'other', name: judge, text: '次にふざけたら、お小遣いを減額します！', fx: 'penalty' }] },
        {
          damage: 25,
          lines: [
            { who: 'other', name: gallery, text: '（ブーイング）' },
            { who: 'other', name: judge, text: '静粛に！ ……被告人、ペナルティです！', fx: 'penalty' },
          ],
        },
      ],
      knockout: [
        { who: 'narr', text: '信頼度が、底をついた。' },
        { who: 'other', name: judge, text: '……もう十分でしょう。判決を言い渡します。' },
        { who: 'narr', text: '有罪', fx: 'guilty' },
      ],
    },
    outro: [
      { who: 'other', name: judge, text: '被告人を、無期限の家事当番に処す。これにて閉廷！', fx: 'gavel' },
      { who: 'other', name: gallery, text: '（拍手）' },
      { who: 'other', name: witness, text: '……明日のゴミ出し、よろしくね。' },
    ],
  },

  // G: 締め出し
  lockout: {
    id: 'lockout',
    title: '締め出し',
    scene: 'bg_lockout',
    onTrigger: ['……ガチャン、と遠くで鍵の音がした。'],
    intro: [
      { who: 'narr', text: '鍵を挿した。……回らない。' },
      { who: 'narr', text: 'ピンポーン。' },
      { who: 'other', name: 'インターホン', text: '……どちら様ですか？' },
      { who: 'me', text: '俺だよ、俺！' },
      { who: 'other', name: 'インターホン', text: '我が家は一人暮らしです。あんまり騒ぐと警察を呼びますよ。' },
      { who: 'narr', text: '表札は、いつの間にか妻の旧姓に変わっていた。' },
      { who: 'narr', text: '足元には布団一式と枕。そして『鍵を交換しました』の張り紙。' },
    ],
    outro: [{ who: 'narr', text: 'その夜、あなたは廊下で星を数えた。' }],
  },

  // H: マンション総出の公開処刑
  exposed: {
    id: 'exposed',
    title: '公開処刑',
    scene: 'bg_exposed',
    onTrigger: ['……マンション中の部屋の灯りが、一斉についた。'],
    intro: [
      { who: 'narr', text: 'ガラッ……と、マンション中の窓が一斉に開いた。' },
      { who: 'narr', text: '全戸の住人が、無言でこちらを見ている。' },
      { who: 'narr', text: '掲示板には『〇〇号室のご主人のご発言について（管理組合）』の貼り紙。' },
      { who: 'narr', text: 'エレベーターの中にも、同じ紙が貼ってあった。' },
      { who: 'other', name: '妻（拡声器）', text: '本人、帰宅しました。' },
    ],
    outro: [{ who: 'narr', text: '拍手が起きた。誰も笑っていなかった。' }],
  },

  // I: スーパー夫婦大戦（往年のロボット大戦の戦闘シーン風）
  robot: {
    id: 'robot',
    title: 'スーパー夫婦大戦',
    scene: 'bg_battle',
    onTrigger: ['……どこからか、やけに熱いBGMが聞こえてきた。'],
    intro: [
      { who: 'narr', text: 'ドアを開けた瞬間、視界が切り替わった。' },
      { who: 'narr', text: '……マンションの廊下が、戦場になっている。' },
      { who: 'wife', text: '出撃準備は、できてるわよね？' },
      { who: 'narr', text: '──戦闘開始！' },
    ],
    battle: {
      hero: { pilot: 'ダンナ', unit: 'サラリーマンガーZ', hp: 3200 },
      wife: { pilot: 'ヨメ', unit: 'グレートワイフ', hp: 99999 },
      steps: [
        { speaker: 'hero', text: 'いくぞ！ 今日こそ言わせてもらう！' },
        { speaker: 'hero', text: 'くらえっ！ 言い訳ミサイル！！', attackName: '言い訳ミサイル', anim: 'attack' },
        { speaker: 'wife', text: '……今、何かした？', anim: 'zero', damage: { to: 'wife', value: 0 }, turn: 'hero' },
        { speaker: 'hero', text: 'そ、そんな……全弾命中したはずなのに……！' },
        { speaker: 'wife', text: '次は、こっちの番ね。', anim: 'charge' },
        { speaker: 'wife', text: '家計簿……バスタァァァーーッ！！', attackName: '超次元家計簿バスター', anim: 'finisher', heroHp: 0, damage: { to: 'hero', value: 9999 } },
        { speaker: 'hero', text: 'うわあああああーーーっ！！', anim: 'shotdown', turn: 'wife' },
        { speaker: 'narr', text: 'サラリーマンガーZは　撃墜された。' },
      ],
    },
    outro: [
      { who: 'wife', text: 'コンティニューは、ないから。' },
      { who: 'narr', text: 'その夜、あなたは廊下で修理（反省）に専念した。' },
    ],
  },
};
