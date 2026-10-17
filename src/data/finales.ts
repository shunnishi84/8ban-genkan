import type { Clue } from '../core/types';

/**
 * 暴言を4種すべて送った日だけに起きる「フィナーレ」。6本からランダムで1本。
 * どれも流血・暴力の描写はしない（暗転や比喩で済ませる）。
 */
export type FinaleId = 'castle' | 'siege' | 'loop' | 'court' | 'lockout' | 'exposed';

export const FINALE_IDS: FinaleId[] = ['castle', 'siege', 'loop', 'court', 'lockout', 'exposed'];

export interface FinaleLine {
  who: 'me' | 'wife' | 'narr' | 'other';
  /** who が other のときの名札（「義母」「裁判長（妻）」など） */
  name?: string;
  text: string;
  /** true のとき、送った暴言を「証拠」として1件ずつ大きなカードで見せる行に展開する */
  evidence?: boolean;
}

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
  scene: 'demon' | 'loop' | 'bg_court' | 'bg_siege' | 'bg_lockout' | 'bg_exposed';
  /** 4つ目の暴言を送った瞬間に出るメッセージ */
  onTrigger: string[];
  /** 送った瞬間にスマホが壊れて、以後スマホが使えなくなる */
  breaksPhone?: boolean;
  /** 送った瞬間に増える手がかり（通知の殺到など） */
  triggerClues?: Clue[];
  /** 玄関前の見た目を変えるオーバーレイ（manifest のキー） */
  doorVisuals?: string[];
  /** 無限玄関ループ: ドアを開けるたびに出るメッセージ（この回数だけループする） */
  loop?: string[];
  intro: FinaleLine[];
  choice?: {
    prompt: string;
    options: FinaleChoice[];
    /** 選ぶたびに相手が反撃してくる（ランダム）。無ければ反撃なし */
    counters?: FinaleCounter[];
    /** こころのHP。反撃で 0 になったら knockout を見せて先へ進む */
    hp?: number;
    knockout?: FinaleLine[];
  };
  outro: FinaleLine[];
}

const judge = '裁判長（妻）';

export const FINALES: Record<FinaleId, Finale> = {
  // A → C: スマホ爆散 → 魔王城で RPG
  castle: {
    id: 'castle',
    title: '魔王城',
    scene: 'demon',
    breaksPhone: true,
    onTrigger: ['バキッ！！ 画面に、ひびが走った。', '「この端末は、妻によってリモート初期化されました」'],
    doorVisuals: ['castle_gate'],
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
      { who: 'other', name: judge, text: '開廷します。' },
      { who: 'other', name: '検察官（義母）', text: '被告人は本日、以下の4件の暴言を送信しました。' },
      { who: 'other', name: '検察官（義母）', text: '', evidence: true },
      { who: 'other', name: '傍聴席（ご近所）', text: 'ざわ……ざわ……' },
      { who: 'other', name: judge, text: '被告人、何か言うことは？' },
    ],
    choice: {
      prompt: '弁護人席は、空っぽだ。',
      options: [
        {
          label: '異議あり！',
          end: true,
          replies: [
            [{ who: 'other', name: judge, text: '却下。' }],
            [{ who: 'other', name: judge, text: '被告人、ここはあなたの法廷ではありません。却下。' }],
          ],
        },
        {
          label: '黙秘',
          end: true,
          replies: [
            [{ who: 'other', name: judge, text: '却下。' }],
            [{ who: 'other', name: '検察官（義母）', text: '黙っていれば済むと思って……。' }, { who: 'other', name: judge, text: '却下。' }],
          ],
        },
        {
          label: '土下座',
          end: true,
          replies: [
            [{ who: 'other', name: judge, text: '……却下。' }],
            [{ who: 'other', name: '傍聴席（ご近所）', text: '（ひそひそ）' }, { who: 'other', name: judge, text: '玄関でもう見飽きました。却下。' }],
          ],
        },
      ],
    },
    outro: [
      { who: 'other', name: judge, text: '判決を言い渡します。' },
      { who: 'other', name: judge, text: '被告人を、無期限の家事当番に処す。' },
      { who: 'narr', text: 'カーン！' },
      { who: 'other', name: '傍聴席（ご近所）', text: '（拍手）' },
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
};
