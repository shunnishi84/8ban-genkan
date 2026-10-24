import { describe, expect, it } from 'vitest';
import { GOAL_DAYS, hm } from '../src/core/config';
import { advanceRun, buildDay, chatText, finaleSeed, chatTimeline, drunkLevel, sentText, chooseScenarios, newRun, perform, startDay, visibleClues } from '../src/core/engine';
import { seeded } from '../src/core/rng';
import { solve } from '../src/core/solver';
import { SCENARIO_MAP } from '../src/data/scenarios';
import { CHAT_MAP, CHAT_TEMPLATES, COLD_REPLIES } from '../src/data/chat';
import { FINALES, FINALE_IDS, type FinaleId } from '../src/data/finales';
import { POSTS, POST_MAP } from '../src/data/posts';
import { ITEM_MAP } from '../src/data/items';

// 暴言は毎日ランダムに4つ選ばれるが、テストでは定番の4つに固定する（ランダム選択そのものは別にテスト）
const CLASSIC_INSULTS = ['insult_oni', 'insult_komakai', 'insult_kaachan', 'insult_gunsou'];
const day = (ids: string[], start = hm(23, 0)) => {
  const s = buildDay(1, ids.map((id) => SCENARIO_MAP[id]), start);
  s.insultIds = [...CLASSIC_INSULTS];
  return s;
};

describe('時計', () => {
  it('午前1:00を過ぎてからドアを開けると、原因に関係なくゲームオーバー', () => {
    const s = day(['neighbor_curry'], hm(24, 56));
    expect(perform(s, { type: 'travel', to: 'town' }).outcome.kind).toBe('continue');
    expect(perform(s, { type: 'travel', to: 'door' }).outcome.kind).toBe('continue');
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('late');
  });

  it('ちょうど 1:00 ならまだセーフ', () => {
    const s = day(['neighbor_curry'], hm(25, 0));
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('2:00 を過ぎるとチャットは既読にならず、ドアはチェーンロックで入れない', () => {
    const s = day(['dinner_unannounced'], hm(26, 1));
    const before = s.chatLog.length;
    const r = perform(s, { type: 'sendChat', template: 'apology_dinner' });
    expect(r.messages.join()).toContain('既読がつかない');
    expect(s.chatLog.slice(before).filter((m) => m.from === 'wife')).toHaveLength(0);
    expect(s.flags.has('chat:apology_dinner')).toBe(true);
    const d = perform(s, { type: 'openDoor' });
    expect(d.ok).toBe(false);
    expect(d.messages.join()).toContain('チェーンロック');
    expect(d.outcome.kind).toBe('continue');
  });

  it('締め出されたら公園で1時間ずつ時間をつぶし、朝6:00に帰ると「朝帰り」', () => {
    const s = day(['neighbor_curry'], hm(26, 5));
    expect(perform(s, { type: 'wait' }).ok).toBe(false);
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'bench' });
    let n = 0;
    while (perform(s, { type: 'wait' }).ok) n++;
    expect(n).toBe(4);
    expect(s.time).toBeGreaterThanOrEqual(hm(30, 0));
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'door' });
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('dawn');
  });

  it('2:00 前は公園で時間をつぶせない', () => {
    const s = day(['neighbor_curry'], hm(23, 0));
    s.location = 'bench';
    expect(perform(s, { type: 'wait' }).ok).toBe(false);
  });

  it('異変なしの日に引き返すと時間だけ消費する', () => {
    const s = day(['ramen_receipt']);
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'door' });
    expect(s.time).toBe(hm(23, 10));
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('同じ場所を2回調べても時間は1回分', () => {
    const s = day(['dinner_unannounced']);
    perform(s, { type: 'inspect', spot: 'door' });
    perform(s, { type: 'inspect', spot: 'door' });
    expect(s.time).toBe(hm(23, 1));
  });
});

describe('通販の締切', () => {
  it('23:59 までの注文は翌朝着で解消になる', () => {
    const s = day(['umbrella_lost'], hm(23, 59));
    perform(s, { type: 'order', item: 'umbrella_same' });
    expect(s.flags.has('ordered:umbrella_same')).toBe(true);
  });

  it('0:00 以降の注文は明後日着で解消にならず、報告チャットも送れない', () => {
    const s = day(['umbrella_lost'], hm(24, 0));
    perform(s, { type: 'order', item: 'umbrella_same' });
    expect(s.flags.has('ordered:umbrella_same')).toBe(false);
    expect(s.flags.has('ordered_late:umbrella_same')).toBe(true);
    expect(perform(s, { type: 'sendChat', template: 'umbrella' }).ok).toBe(false);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('既存注文のキャンセルは 0:00 の発送処理まで', () => {
    const s = day(['card_overuse'], hm(24, 0));
    expect(perform(s, { type: 'cancelOrder', item: 'golf_club' }).ok).toBe(false);
  });
});

describe('行動', () => {
  it('コンビニに無い商品（指定ブランドの洗剤）は買えない', () => {
    const s = day(['shopping_forgot']);
    s.location = 'konbini';
    expect(perform(s, { type: 'buy', item: 'detergent_refill' }).ok).toBe(false);
    expect(perform(s, { type: 'buy', item: 'detergent_generic' }).ok).toBe(true);
  });

  it('関係ないチャットを送ると電話で問い詰められてペナルティ', () => {
    const s = day(['dinner_unannounced']);
    const r = perform(s, { type: 'sendChat', template: 'love' });
    expect(r.cost).toBeGreaterThan(2);
    const ok = perform(s, { type: 'sendChat', template: 'apology_dinner' });
    expect(ok.cost).toBe(2);
  });

  it('着替えると口紅の手がかりが消える', () => {
    const s = day(['cabaret_lipstick']);
    expect(visibleClues(s, 'slot:shirt')).toHaveLength(1);
    s.location = 'konbini';
    perform(s, { type: 'buy', item: 'spare_shirt' });
    perform(s, { type: 'use', item: 'spare_shirt' });
    expect(visibleClues(s, 'slot:shirt')).toHaveLength(0);
  });

  it('原因が2つあるとき、片方だけ解消しても怒られる（未解消の原因が返る）', () => {
    const s = day(['ring_off', 'tie_lost']);
    perform(s, { type: 'use', item: 'ring' });
    const r = perform(s, { type: 'openDoor' });
    expect(r.outcome.kind).toBe('angry');
    if (r.outcome.kind === 'angry') expect(r.outcome.causes.map((c) => c.id)).toEqual(['tie_lost']);
  });
});

describe('チャットの時系列', () => {
  const minutes = (text: string) => {
    if (text.includes('（昨日）')) return -1;
    const m = text.match(/（(\d{1,2}):(\d{2})）\s*$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : Infinity;
  };

  it('複数の火種を合成しても、チャットは時刻順に並ぶ', () => {
    // dinner(19:02, 22:15) と morning(7:46, 7:48) と umbrella(23:10) を逆順に合成
    const s = day(['umbrella_lost', 'dinner_unannounced', 'morning_fight']);
    const times = chatTimeline(s).map((c) => minutes(c.text));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBe(7 * 60 + 46);
  });

  it('全シナリオのチャット手がかりに時刻（または昨日）が付いている', () => {
    for (const s of Object.values(SCENARIO_MAP)) {
      for (const c of s.clues.filter((x) => x.at === 'app:chat')) {
        expect(Number.isFinite(minutes(c.text)), `${s.id}: ${c.text}`).toBe(true);
      }
    }
  });
});

describe('新しい仕掛け', () => {
  it('誤爆メッセージは 0:00 の既読前なら送信取消できる', () => {
    const s = day(['wrong_send'], hm(23, 50));
    expect(perform(s, { type: 'unsend', clue: 'wrong_send' }).ok).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('既読がついたら取り消せない', () => {
    const s = day(['wrong_send'], hm(24, 0));
    expect(perform(s, { type: 'unsend', clue: 'wrong_send' }).ok).toBe(false);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('誤爆を取り消す前に何か送ると、誤爆にも既読がついて詰む', () => {
    const s = day(['wrong_send', 'ramen_receipt'], hm(23, 0));
    const r = perform(s, { type: 'sendChat', template: 'love' });
    expect(r.messages.join()).toContain('既読がついた');
    expect(perform(s, { type: 'unsend', clue: 'wrong_send' }).ok).toBe(false);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('先に取り消してから送れば大丈夫', () => {
    const s = day(['wrong_send'], hm(23, 0));
    perform(s, { type: 'unsend', clue: 'wrong_send' });
    expect(perform(s, { type: 'sendChat', template: 'love' }).messages.join()).not.toContain('既読がついた');
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('飲み会の集合写真は後輩チャットの日にしか送れず、送ると写真つきで残る', () => {
    expect(perform(day(['ramen_receipt']), { type: 'sendChat', template: 'kouhai_photo' }).ok).toBe(false);
    const s = day(['kouhai_chat']);
    expect(perform(s, { type: 'sendChat', template: 'kouhai_photo' }).ok).toBe(true);
    expect(s.chatLog.find((m) => m.from === 'me')?.image).toBe('group_photo');
  });

  it('メシマズの日に料理本を買って伝えると、火種を消していても火に油', () => {
    const s = day(['sns_meshi'], hm(23, 0));
    expect(perform(s, { type: 'sendChat', template: 'meshi_recipe' }).ok).toBe(false);
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    s.location = 'konbini';
    perform(s, { type: 'buy', item: 'saru_recipe' });
    expect(perform(s, { type: 'sendChat', template: 'meshi_recipe' }).ok).toBe(true);
    s.location = 'door';
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o.kind).toBe('angry');
    // 本も持ったままなので「誰がサルだ」も重なる
    if (o.kind === 'angry') expect(o.causes.map((c) => c.title)).toEqual(['火に油', 'サルでも出来るレシピ']);
    const other = day(['ring_off']);
    other.location = 'konbini';
    perform(other, { type: 'buy', item: 'saru_recipe' });
    expect(perform(other, { type: 'sendChat', template: 'meshi_recipe' }).ok).toBe(false);
  });

  it('メシマズの日に料理本を持って帰ると「誰がサルだ」。捨ててから帰れば大丈夫。ほかの日は何も言われない', () => {
    const carry = day(['sns_meshi'], hm(23, 0));
    for (const a of solve(carry)!) if (a.type !== 'openDoor') perform(carry, a);
    carry.location = 'konbini';
    perform(carry, { type: 'buy', item: 'saru_recipe' });
    carry.location = 'door';
    const o = perform(carry, { type: 'openDoor' }).outcome;
    expect(o).toMatchObject({ kind: 'angry', causes: [{ id: 'carry:saru_recipe' }] });
    if (o.kind === 'angry') expect(o.causes[0].angerLines).toContain('誰がサルだ。');

    const thrown = day(['sns_meshi'], hm(23, 0));
    for (const a of solve(thrown)!) if (a.type !== 'openDoor') perform(thrown, a);
    thrown.location = 'konbini';
    perform(thrown, { type: 'buy', item: 'saru_recipe' });
    thrown.location = 'trash';
    perform(thrown, { type: 'discard', item: 'saru_recipe' });
    thrown.location = 'door';
    expect(perform(thrown, { type: 'openDoor' }).outcome.kind).toBe('home');

    const other = day(['ring_off']);
    for (const a of solve(other)!) if (a.type !== 'openDoor') perform(other, a);
    other.location = 'konbini';
    perform(other, { type: 'buy', item: 'saru_recipe' });
    other.location = 'door';
    expect(perform(other, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('テレビで鬼の日に「そのまんまの意味だよ」を送ると、温泉を取っても手遅れ', () => {
    const s = day(['tv_interview'], hm(23, 0));
    expect(perform(s, { type: 'sendChat', template: 'tv_sonomama' }).ok).toBe(true);
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    expect(s.flags.has('ordered:onsen_ticket')).toBe(true);
    expect(s.chatLog.at(-1)!.text).toContain('そのまんまの意味だよ」って言ったよね');
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o).toMatchObject({ kind: 'angry', causes: [{ id: 'provoke:tv_sonomama' }] });
    if (o.kind === 'angry') expect(o.causes[0].angerLines).toContain('鬼と一緒じゃ、気が休まらないでしょ。');

    // 温泉を取っていなければ、金棒の方
    const t = day(['tv_interview'], hm(23, 0));
    perform(t, { type: 'sendChat', template: 'tv_sonomama' });
    const o2 = perform(t, { type: 'openDoor' }).outcome;
    if (o2.kind === 'angry') expect(o2.causes[0].angerLines).toContain('金棒、どこにしまったかしら。');
    expect(CHAT_MAP.tv_sonomama.disguised).toBe(true);
    expect(perform(day(['ring_off']), { type: 'sendChat', template: 'tv_sonomama' }).ok).toBe(false);
  });

  it('メシマズの日に「だって昨日のご飯だって」と説明を始めると、送るたびに次の説明が出て、どれも火に油', () => {
    const s = day(['sns_meshi'], hm(23, 0));
    expect(perform(s, { type: 'sendChat', template: 'meshi_setsumei_2' }).ok).toBe(false);
    for (const id of ['meshi_setsumei_1', 'meshi_setsumei_2', 'meshi_setsumei_3']) {
      expect(CHAT_MAP[id].disguised).toBe(true);
      expect(perform(s, { type: 'sendChat', template: id }).ok).toBe(true);
    }
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    s.location = 'door';
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o.kind).toBe('angry');
    if (o.kind === 'angry') expect(o.causes.filter((c) => c.title === '火に油')).toHaveLength(3);
  });

  it('料理本のメッセージは、余計なひと言なのに普通の定型文の顔をしている', () => {
    expect(CHAT_MAP.meshi_recipe.provokeLines?.length).toBeGreaterThan(0);
    expect(CHAT_MAP.meshi_recipe.disguised).toBe(true);
  });

  it('写真集の日だけ最低の言い訳が送れて、送ると火に油', () => {
    expect(perform(day(['ring_off']), { type: 'sendChat', template: 'gravure_akiru' }).ok).toBe(false);
    for (const id of ['gravure_hoyou', 'gravure_akiru', 'gravure_hikaku', 'gravure_shiryou', 'gravure_tomodachi']) {
      const s = day(['gravure_found'], hm(23, 0));
      for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
      expect(perform(s, { type: 'sendChat', template: id }).ok).toBe(true);
      const o = perform(s, { type: 'openDoor' }).outcome;
      expect(o.kind).toBe('angry');
    }
  });

  it('缶ビール2本以上で「心配させる悪ふざけ」が送れて、送ると文面ごとの結末になる', () => {
    const s = day(['neighbor_curry']);
    expect(perform(s, { type: 'sendChat', template: 'prank_jiko' }).ok).toBe(false);
    s.location = 'konbini';
    for (let i = 0; i < 2; i++) perform(s, { type: 'buy', item: 'beer' });
    perform(s, { type: 'use', item: 'beer' });
    expect(perform(s, { type: 'sendChat', template: 'prank_jiko' }).ok).toBe(false);
    perform(s, { type: 'use', item: 'beer' });
    expect(perform(s, { type: 'sendChat', template: 'prank_jiko' }).ok).toBe(true);
    // 交通事故の嘘: 妻が方々に電話した通知が届く
    expect(visibleClues(s, 'notice').some((c) => c.text.includes('警察署'))).toBe(true);
    s.location = 'door';
    expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'prank', template: 'prank_jiko' });
  });

  it('悪ふざけの結末は3つとも違い、火種を消していても結末が優先される', () => {
    const titles = new Set<string>();
    for (const id of ['prank_jiko', 'prank_kaidan', 'prank_mune']) {
      const s = day(['ring_off']);
      for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
      s.flags.add('drunk:1').add('drunk:2');
      expect(perform(s, { type: 'sendChat', template: id }).ok).toBe(true);
      s.location = 'door';
      expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'prank', template: id });
      titles.add(CHAT_MAP[id].prankEnding!.title);
    }
    expect(titles.size).toBe(3);
  });

  it('AV つけっぱなしの日だけ「とぼける」が送れて、送ると火に油', () => {
    expect(perform(day(['ring_off']), { type: 'sendChat', template: 'av_nanino' }).ok).toBe(false);
    const s = day(['av_left_on'], hm(23, 0));
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    expect(perform(s, { type: 'sendChat', template: 'av_drama' }).ok).toBe(true);
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o.kind).toBe('angry');
    if (o.kind === 'angry') expect(o.causes.map((c) => c.title)).toEqual(['火に油']);
  });

  it('後輩の日だけ「余計なひと言」が送れて、送ると火種を消していても怒られる', () => {
    expect(perform(day(['ring_off']), { type: 'sendChat', template: 'kouhai_kawaii' }).ok).toBe(false);
    const s = day(['kouhai_chat'], hm(23, 0));
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    expect(perform(s, { type: 'sendChat', template: 'kouhai_kawaii' }).ok).toBe(true);
    expect(s.chatLog.at(-1)).toEqual({ from: 'wife', text: '……へえ。' });
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o.kind).toBe('angry');
    if (o.kind === 'angry') expect(o.causes.map((c) => c.title)).toEqual(['火に油']);
  });

  it('ゴミ出し忘れは解消しても小言つき（渋々許す日）', () => {
    const s = day(['garbage_forgot']);
    expect(s.grudging).toBe(true);
    for (const a of solve(s)!) perform(s, a);
    expect(s.successLines.join()).toContain('今度から');
    expect(day(['ring_off', 'neighbor_curry']).grudging).toBe(false);
  });

  it('「だったら自分で捨てておいてくれよ」はゴミの日だけ送れて、送ると魔王城へ直行', () => {
    expect(perform(day(['ring_off']), { type: 'sendChat', template: 'garbage_yourself' }).ok).toBe(false);
    const s = day(['garbage_forgot']);
    s.location = 'konbini';
    expect(perform(s, { type: 'sendChat', template: 'garbage_yourself' }).ok).toBe(true);
    expect(s.finale).toBe('castle');
    expect(s.location).toBe('door');
    expect(s.flags.has('phone_broken')).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'finale', finale: 'castle' });
  });

  it('ワイシャツを脱いだまま帰ると、火種が無くても怒られる', () => {
    const s = day(['ramen_receipt']);
    expect(perform(s, { type: 'undress' }).ok).toBe(true);
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o.kind).toBe('angry');
    if (o.kind === 'angry') expect(o.causes[0].angerLines).toContain('なんて格好で帰ってきてるの！');
  });

  it('着直すか、替えのシャツに着替えれば大丈夫', () => {
    const a = day(['ramen_receipt']);
    perform(a, { type: 'undress' });
    perform(a, { type: 'dress' });
    expect(perform(a, { type: 'openDoor' }).outcome.kind).toBe('home');

    // 脱いだままでは替えのシャツも売ってもらえないので、先に買っておく
    const b = day(['cabaret_lipstick']);
    perform(b, { type: 'travel', to: 'town' });
    perform(b, { type: 'travel', to: 'konbini' });
    perform(b, { type: 'buy', item: 'spare_shirt' });
    perform(b, { type: 'undress' });
    perform(b, { type: 'use', item: 'spare_shirt' });
    expect(b.flags.has('undressed')).toBe(false);
  });

  it('「今から帰るね」は状況に合わせた返事になる（帰ってこなくていいと言われた日に「はーい」は無い）', () => {
    const replies = SCENARIO_MAP.sns_meiru.chatReplies!.coming_home;
    const s = day(['sns_meiru']);
    expect(perform(s, { type: 'sendChat', template: 'coming_home' }).cost).toBe(2);
    expect(replies).toContain(s.chatLog.at(-1)!.text);
  });

  it('火種を消したあとは :after の返事', () => {
    const s = day(['sns_meiru']);
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    perform(s, { type: 'sendChat', template: 'coming_home' });
    expect(s.chatLog.at(-1)!.text).toBe('……帰ってきていいよ。');
  });

  it('事情を知っている妻に「ほんとにごめん…」だけ送ると、説教で時間を失う', () => {
    const s = day(['tv_interview']);
    const r = perform(s, { type: 'sendChat', template: 'sorry_generic' });
    expect(SCENARIO_MAP.tv_interview.chatReplies!.sorry_generic).toContain(s.chatLog.at(-1)!.text);
    expect(r.messages.join()).toContain('謝るだけなら誰でもできる');
    expect(r.cost).toBe(10);
  });

  it('何も知らない妻への「ほんとにごめん…」は、これまでどおり「何が？？」で問い詰め', () => {
    const s = day(['cabaret_lipstick']);
    const r = perform(s, { type: 'sendChat', template: 'sorry_generic' });
    expect(s.chatLog.at(-1)!.text).toBe('何が？？ ちょっと電話するね');
    expect(r.messages.join()).toContain('しどろもどろ');
  });

  it('別件の謝罪を送ると「話をそらさないで」系の返事', () => {
    const s = day(['tv_interview']);
    perform(s, { type: 'sendChat', template: 'apology_dinner' });
    expect(s.chatLog.at(-1)!.text).toContain('テレビ');
  });

  it('仲直りしたあとの「ほんとにごめん…」は電話も来ない', () => {
    const s = day(['morning_fight']);
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    const t0 = s.time;
    perform(s, { type: 'sendChat', template: 'sorry_generic' });
    expect(s.time - t0).toBe(2);
    expect(s.chatLog.at(-1)!.text).toBe('……もういいよ。私も、ごめん。');
  });

  it('妻が知らないまま片付いた日（誤爆を取り消した等）に謝っても「もういいよ」にはならない', () => {
    const a = day(['wrong_send'], hm(23, 0));
    perform(a, { type: 'unsend', clue: 'wrong_send' });
    perform(a, { type: 'sendChat', template: 'sorry_generic' });
    expect(a.chatLog.at(-1)!.text).toContain('寝ぼけた');

    const b = day(['cabaret_lipstick']);
    for (const x of solve(b)!) if (x.type !== 'openDoor') perform(b, x);
    perform(b, { type: 'sendChat', template: 'sorry_generic' });
    expect(b.chatLog.at(-1)!.text).toBe('何が？？ ちょっと電話するね');
  });

  it('日付をまたいでから「今から帰るね」は深夜の返事', () => {
    const s = day(['cabaret_lipstick'], hm(24, 10));
    perform(s, { type: 'sendChat', template: 'coming_home' });
    expect(s.chatLog.at(-1)!.text).not.toBe('はーい。気をつけてね');
  });

  it('缶ビールは1日3本まで。飲むたびに酔いが進む', () => {
    const s = day(['neighbor_curry']);
    s.location = 'konbini';
    for (let i = 0; i < 3; i++) expect(perform(s, { type: 'buy', item: 'beer' }).ok).toBe(true);
    expect(perform(s, { type: 'buy', item: 'beer' }).ok).toBe(false);
    expect(drunkLevel(s)).toBe(0);
    perform(s, { type: 'use', item: 'beer' });
    perform(s, { type: 'use', item: 'beer' });
    expect(drunkLevel(s)).toBe(2);
    expect(s.inventory.filter((i) => i === 'beer')).toHaveLength(1);
  });

  it('暴言は酔うほどひどい文面になり、送った文面が証拠として残る', () => {
    const s = day(['neighbor_curry']);
    s.location = 'konbini';
    const oni = CHAT_MAP.insult_oni;
    expect(chatText(s, oni)).toBe(oni.text);
    perform(s, { type: 'sendChat', template: 'insult_oni' });
    for (let i = 0; i < 3; i++) perform(s, { type: 'buy', item: 'beer' });
    for (let i = 0; i < 3; i++) perform(s, { type: 'use', item: 'beer' });
    expect(chatText(s, oni)).toBe(oni.drunkText![2]);
    expect(sentText(s, 'insult_oni')).toBe(oni.text);
    perform(s, { type: 'sendChat', template: 'insult_gunsou' });
    expect(sentText(s, 'insult_gunsou')).toBe(CHAT_MAP.insult_gunsou.drunkText![2]);
    expect(s.chatLog.find((m) => m.from === 'me' && m.text === CHAT_MAP.insult_gunsou.drunkText![2])).toBeDefined();
  });

  it('妻が先に寝ている日は、無事に帰っても妻のセリフではなくナレーション', () => {
    const s = day(['wrong_send', 'garbage_forgot'], hm(23, 0));
    expect(s.asleepLines).toHaveLength(1);
    expect(s.successLines.join()).not.toContain('早く寝ちゃった');
    expect(s.successLines.join()).toContain('今度から');
    expect(day(['ramen_receipt']).asleepLines).toHaveLength(1);
    expect(day(['neighbor_curry']).asleepLines).toHaveLength(0);
  });

  it('接着剤は割れたマグカップを持っていないと使えない', () => {
    const s = day(['dinner_unannounced']);
    s.location = 'konbini';
    perform(s, { type: 'buy', item: 'glue' });
    expect(perform(s, { type: 'use', item: 'glue' }).ok).toBe(false);
  });

  it('妻が帰省中の日は「おかえり」が無い帰宅になる', () => {
    const s = day(['wife_away']);
    expect(s.homeAlone).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
    expect(day(['ring_off']).homeAlone).toBe(false);
  });
});

describe('SNS・AV・写真集', () => {
  it('SNS の炎上投稿は削除でき、通知も消える。削除しないと謝罪チャットは送れない', () => {
    const s = day(['sns_meshi']);
    expect(perform(s, { type: 'sendChat', template: 'sns_meshi_sorry' }).ok).toBe(false);
    expect(visibleClues(s, 'notice')).toHaveLength(1);
    expect(perform(s, { type: 'deletePost', clue: 'post_meshi' }).ok).toBe(true);
    expect(visibleClues(s, 'notice')).toHaveLength(0);
  });

  it('SNS の3パターンは同じ日に重ならない', () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const ids = chooseScenarios({ day: 8, used: [], streak: 0 }, rng).map((x) => x.id);
      expect(ids.filter((id) => id.startsWith('sns_')).length).toBeLessThanOrEqual(1);
    }
  });

  it('AV のサブスクは 0:00 の自動更新を過ぎると解約できない', () => {
    const s = day(['av_left_on'], hm(24, 0));
    expect(perform(s, { type: 'cancelOrder', item: 'av_subscription' }).ok).toBe(false);
  });

  it('写真集は玄関マットで拾ってゴミ捨て場で捨て、白状すれば許される', () => {
    const s = day(['gravure_found']);
    perform(s, { type: 'pickup', item: 'gravure_book' });
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'trash' });
    perform(s, { type: 'discard', item: 'gravure_book' });
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'door' });
    perform(s, { type: 'sendChat', template: 'gravure_sorry' });
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });
});

describe('暴言（おふざけ枠）', () => {
  it('暴言を送ると、火種を全部消していてもドアの向こうは魔王', () => {
    const s = day(['ring_off']);
    perform(s, { type: 'use', item: 'ring' });
    perform(s, { type: 'sendChat', template: 'insult_oni' });
    const r = perform(s, { type: 'openDoor' });
    expect(r.outcome.kind).toBe('demon');
    if (r.outcome.kind === 'demon') expect(r.outcome.lines[0]).toBe('……鬼嫁？');
  });

  it('異変なしの日でも、妻が帰省中でも、暴言を送れば魔王', () => {
    for (const id of ['neighbor_curry', 'wife_away']) {
      const s = day([id]);
      perform(s, { type: 'sendChat', template: 'insult_komakai' });
      expect(perform(s, { type: 'openDoor' }).outcome.kind, id).toBe('demon');
    }
  });

  it('暴言を送ったまま 1:00 を過ぎても、ただの時間切れではなく魔王', () => {
    // 24:55 に送信（+2分）→ 街へ（+5分）で 1:02
    const s = day(['neighbor_curry'], hm(24, 55));
    perform(s, { type: 'sendChat', template: 'insult_gunsou' });
    expect(perform(s, { type: 'travel', to: 'town' }).outcome.kind).toBe('demon');
  });

  it('暴言のあとは、謝っても何を送っても取りつく島もない返事だけ', () => {
    const s = day(['dinner_unannounced']);
    perform(s, { type: 'sendChat', template: 'insult_oni' });
    const before = s.chatLog.length;
    perform(s, { type: 'sendChat', template: 'apology_dinner' });
    perform(s, { type: 'sendChat', template: 'love' });
    perform(s, { type: 'sendChat', template: 'insult_gunsou' });
    const replies = s.chatLog.slice(before).filter((m) => m.from === 'wife').map((m) => m.text);
    expect(replies).toHaveLength(3);
    for (const r of replies) expect(COLD_REPLIES).toContain(r);
    // 関係ない「愛してるよ」でも電話は来ない（2分だけ）
    expect(s.time).toBe(hm(23, 8));
  });

  it('暴言は電話ペナルティなしの2分（その代わり取り返しがつかない）', () => {
    const s = day(['neighbor_curry']);
    expect(perform(s, { type: 'sendChat', template: 'insult_kaachan' }).cost).toBe(2);
  });
});

describe('妻が酔っている日', () => {
  it('およそ 1/10 の日で、妻が家にいる日だけ起きる', () => {
    let drunk = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const s = startDay(newRun(), seeded(i + 1));
      if (s.wifeDrunk) {
        drunk++;
        expect(s.homeAlone).toBe(false);
        expect(s.asleepLines).toHaveLength(0);
      }
    }
    expect(drunk / N).toBeGreaterThan(0.05);
    expect(drunk / N).toBeLessThan(0.13);
  });

  it('妻が酔っている日はほかの異変が起きず、5日目までしか出ない', () => {
    let drunk = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const rng = seeded(seed);
      const run = newRun();
      for (let d = 1; d <= GOAL_DAYS; d++) {
        const s = startDay(run, rng);
        if (s.wifeDrunk) {
          drunk++;
          expect(d).toBeLessThanOrEqual(5);
          expect(s.scenarioIds).toHaveLength(1);
        }
        advanceRun(run, s);
      }
    }
    expect(drunk).toBeGreaterThan(50);
  });

  it('からみ酒: いつもは罠の「愛してるよ」が正解。送らないと理不尽に怒られる', () => {
    const a = day(['neighbor_curry', 'wife_drunk_karami']);
    expect(perform(a, { type: 'openDoor' }).outcome.kind).toBe('angry');
    const b = day(['neighbor_curry', 'wife_drunk_karami']);
    expect(perform(b, { type: 'sendChat', template: 'love' }).cost).toBe(2);
    expect(perform(b, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'home', special: 'drunk' });
  });

  it('甘え上戸: アイスを買って帰れば、ほかの火種を1つだけ見逃してもらえる', () => {
    const one = day(['ring_off', 'wife_drunk_amae']);
    one.location = 'konbini';
    perform(one, { type: 'buy', item: 'ice_cream' });
    one.location = 'door';
    expect(perform(one, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'home', special: 'drunk' });
    const two = day(['ring_off', 'tie_lost', 'wife_drunk_amae']);
    two.location = 'konbini';
    perform(two, { type: 'buy', item: 'ice_cream' });
    two.location = 'door';
    expect(perform(two, { type: 'openDoor' }).outcome.kind).toBe('angry');
    expect(perform(day(['wife_drunk_amae']), { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('記憶リセット: チャットや注文の手当ては忘れてくれるが、物的証拠は翌朝バレる', () => {
    // 結婚記念日（注文＋チャットで解消）は何もしなくても忘れてくれる
    expect(perform(day(['anniversary_forgot', 'wife_drunk_reset']), { type: 'openDoor' }).outcome).toMatchObject({ kind: 'home', special: 'reset' });
    // 口紅シャツ（着替え・名刺とレシートを捨てる）は証拠が残る
    const s = day(['cabaret_lipstick', 'wife_drunk_reset']);
    expect(perform(s, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'angry', morning: true });
  });

  it('逆魔王: やさしくいなす定型文が正解。この日だけ出る', () => {
    expect(perform(day(['neighbor_curry']), { type: 'sendChat', template: 'drunk_calm' }).ok).toBe(false);
    const s = day(['neighbor_curry', 'wife_drunk_gyaku']);
    expect(perform(s, { type: 'sendChat', template: 'drunk_calm' }).ok).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'home', special: 'drunk' });
  });

  it('夫婦そろって酔っ払いなら、火種はうやむやで宴会', () => {
    const s = day(['cabaret_lipstick', 'wife_drunk_karami']);
    s.flags.add('drunk:1').add('drunk:2');
    expect(perform(s, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'home', special: 'party' });
  });

  it('酔った妻の日も、自動解答器で解ける', () => {
    for (const id of ['wife_drunk_karami', 'wife_drunk_amae', 'wife_drunk_reset', 'wife_drunk_gyaku']) {
      const s = day(['ring_off', id]);
      const plan = solve(s);
      expect(plan, id).not.toBeNull();
      let last;
      for (const a of plan!) last = perform(s, a);
      expect(last!.outcome.kind, id).toBe('home');
    }
  });
});

describe('つぶやきーへの投稿と強い酒', () => {
  /** コンビニで買って、その場で飲む */
  const drink = (s: ReturnType<typeof day>, item: string, times = 1) => {
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'konbini' });
    let last = perform(s, { type: 'buy', item });
    for (let i = 0; i < times; i++) {
      if (i > 0) perform(s, { type: 'buy', item });
      last = perform(s, { type: 'use', item });
    }
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'door' });
    return last;
  };
  const postsAt = (level: number) => POSTS.filter((p) => p.level === level && !p.onlyWith);

  it('酔いの段階ごとに3つずつ投稿でき、しらふの投稿は無害', () => {
    for (const level of [0, 1, 2, 3]) expect(postsAt(level)).toHaveLength(3);
    const s = day(['neighbor_curry']);
    expect(perform(s, { type: 'post', post: 'tw_de' }).ok).toBe(false); // しらふでは悪口は出てこない
    expect(perform(s, { type: 'post', post: 'tw_kacho' }).cost).toBe(2);
    expect(visibleClues(s, 'app:sns').some((c) => c.text.includes('課長の話が長すぎて'))).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('酔い1の悪口: 0:00 に妻が見る前に消せばセーフ、見られたら怒られる', () => {
    const safe = day(['neighbor_curry']);
    drink(safe, 'beer');
    perform(safe, { type: 'post', post: 'tw_kogoto' });
    perform(safe, { type: 'deletePost', clue: 'tw_kogoto' });
    expect(perform(safe, { type: 'openDoor' }).outcome.kind).toBe('home');

    const kept = day(['neighbor_curry']);
    drink(kept, 'beer');
    perform(kept, { type: 'post', post: 'tw_kogoto' });
    expect(perform(kept, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'angry', causes: [{ id: 'tweet:tw_kogoto' }] });

    const late = day(['neighbor_curry']);
    drink(late, 'beer');
    perform(late, { type: 'post', post: 'tw_kogoto' });
    late.time = hm(24, 1);
    expect(perform(late, { type: 'deletePost', clue: 'tw_kogoto' }).messages[0]).toContain('もう見ていた');
    expect(perform(late, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('酔い2は10分で見つかり、酔い3は一瞬でバズって消しても手遅れ（妻が魔王化）', () => {
    const two = day(['neighbor_curry']);
    drink(two, 'beer', 2);
    perform(two, { type: 'post', post: 'tw_genkan' });
    two.time += 10;
    perform(two, { type: 'deletePost', clue: 'tw_genkan' });
    expect(perform(two, { type: 'openDoor' }).outcome.kind).toBe('angry');

    const three = day(['neighbor_curry']);
    drink(three, 'beer', 3);
    expect(perform(three, { type: 'post', post: 'tw_gosan' }).messages[0]).toContain('バズった');
    perform(three, { type: 'deletePost', clue: 'tw_gosan' });
    expect(perform(three, { type: 'openDoor' }).outcome).toEqual({
      kind: 'demon',
      lines: POST_MAP.tw_gosan.demonLines,
      reason: 'つぶやきーの炎上による魔王化',
    });
  });

  it('バズったあとは、何を送っても取りつく島もない', () => {
    const s = day(['neighbor_curry']);
    drink(s, 'cup_sake');
    perform(s, { type: 'post', post: 'tw_hakamori' });
    perform(s, { type: 'sendChat', template: 'coming_home' });
    expect(COLD_REPLIES).toContain(s.chatLog.at(-1)!.text);
  });

  it('酔い3の投稿を3つともつぶやくと、魔王城の最終形態', () => {
    const s = day(['neighbor_curry']);
    drink(s, 'cup_sake');
    perform(s, { type: 'post', post: 'tw_miryoku' });
    perform(s, { type: 'post', post: 'tw_hakamori' });
    expect(s.finale).toBeUndefined();
    const r = perform(s, { type: 'post', post: 'tw_gosan' });
    expect(r.messages).toEqual(expect.arrayContaining(FINALES.castle.trap!.warp));
    expect(s.finale).toBe('castle');
    expect(s.flags.has('finale_by_tweet')).toBe(true);
    expect(s.flags.has('phone_broken')).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'finale', finale: 'castle' });
  });

  it('カップ清酒は1杯で酔い3。ビールを足しても3より上には行かない', () => {
    const s = day(['neighbor_curry']);
    drink(s, 'cup_sake');
    expect(drunkLevel(s)).toBe(3);
    drink(s, 'beer');
    expect(drunkLevel(s)).toBe(3);
    expect(perform(s, { type: 'post', post: 'tw_miryoku' }).ok).toBe(true);
  });

  it('スピリタスは飲んだ瞬間に酔いつぶれて病院送り', () => {
    const s = day(['neighbor_curry']);
    expect(drink(s, 'spirytus').outcome).toEqual({ kind: 'collapse', item: 'spirytus' });
  });
});

describe('脱いだ格好で出歩く', () => {
  const toTown = (s: ReturnType<typeof day>) => perform(s, { type: 'travel', to: 'town' });

  it('肌着で公園へ行くと、巡回中のお巡りさんに保護されて交番', () => {
    const s = day(['neighbor_curry']);
    perform(s, { type: 'undress' });
    expect(toTown(s).outcome.kind).toBe('continue');
    expect(perform(s, { type: 'travel', to: 'bench' }).outcome).toEqual({ kind: 'arrest', ending: 'koban_park' });
  });

  it('肌着のコンビニでは売ってもらえず、3回目で通報される', () => {
    const s = day(['neighbor_curry']);
    perform(s, { type: 'undress' });
    toTown(s);
    perform(s, { type: 'travel', to: 'konbini' });
    expect(perform(s, { type: 'buy', item: 'milk' }).ok).toBe(false);
    expect(perform(s, { type: 'buy', item: 'milk' }).ok).toBe(false);
    expect(s.inventory).not.toContain('milk');
    expect(perform(s, { type: 'buy', item: 'eggs' }).outcome).toEqual({ kind: 'arrest', ending: 'koban_konbini' });
  });

  it('脱いだワイシャツはゴミ捨て場に捨てられる。捨てたらもう着られない', () => {
    const s = day(['neighbor_curry']);
    perform(s, { type: 'undress' });
    toTown(s);
    perform(s, { type: 'travel', to: 'trash' });
    expect(perform(s, { type: 'discardShirt' }).ok).toBe(true);
    expect(perform(s, { type: 'dress' }).ok).toBe(false);
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'door' });
    expect(perform(s, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'angry', causes: [{ id: 'undressed' }] });
  });

  it('ズボンは肌着で酔い3のときだけ脱げる。パンツ一丁で街に出ると留置場', () => {
    const s = day(['neighbor_curry']);
    perform(s, { type: 'undress' });
    expect(perform(s, { type: 'undressPants' }).ok).toBe(false);
    for (let n = 1; n <= 3; n++) s.flags.add(`drunk:${n}`);
    expect(perform(s, { type: 'undressPants' }).outcome.kind).toBe('continue'); // 玄関前なら誰にも見られない
    expect(toTown(s).outcome).toEqual({ kind: 'arrest', ending: 'jail' });
  });

  it('パンツ一丁で帰るともっと怒られる。ズボンをはき直せば肌着に戻る', () => {
    const s = day(['neighbor_curry']);
    for (let n = 1; n <= 3; n++) s.flags.add(`drunk:${n}`);
    perform(s, { type: 'undress' });
    perform(s, { type: 'undressPants' });
    expect(perform(s, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'angry', causes: [{ id: 'pantsless' }] });
    const t = day(['neighbor_curry']);
    for (let n = 1; n <= 3; n++) t.flags.add(`drunk:${n}`);
    perform(t, { type: 'undress' });
    perform(t, { type: 'undressPants' });
    perform(t, { type: 'dress' });
    perform(t, { type: 'dress' });
    expect(perform(t, { type: 'openDoor' }).outcome.kind).toBe('home');
  });
});

describe('謝りすぎてブチギレ', () => {
  const sorries = CHAT_TEMPLATES.filter((t) => t.sorryMore).map((t) => t.id);
  const snaps = CHAT_TEMPLATES.filter((t) => t.snap).map((t) => t.id);
  const available = (s: ReturnType<typeof day>, ids: string[]) => ids.filter((id) => CHAT_MAP[id] && perform({ ...s, flags: new Set(s.flags), chatLog: [...s.chatLog], clues: [...s.clues] }, { type: 'sendChat', template: id }).ok);

  it('「ほんとにごめん…」のあと、追いごめんが1つずつランダムな順で出てくる', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const s = buildDay(1, [SCENARIO_MAP.ring_off], hm(23, 0), i / 30);
      expect(available(s, sorries)).toEqual([]);
      perform(s, { type: 'sendChat', template: 'sorry_generic' });
      const order: string[] = [];
      for (let k = 0; k < 3; k++) {
        const next = available(s, sorries);
        expect(next).toHaveLength(1);
        order.push(next[0]);
        perform(s, { type: 'sendChat', template: next[0] });
      }
      orders.add(order.join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('3つ目の追いごめんで夫がブチギレて、怒りのメッセージしか送れなくなり、送ると魔王', () => {
    const s = day(['ring_off']);
    expect(available(s, snaps)).toEqual([]);
    perform(s, { type: 'sendChat', template: 'sorry_generic' });
    for (let k = 0; k < 2; k++) perform(s, { type: 'sendChat', template: available(s, sorries)[0] });
    expect(s.flags.has('snapped')).toBe(false);
    const r = perform(s, { type: 'sendChat', template: available(s, sorries)[0] });
    expect(r.messages.join('')).toContain('プツン');
    expect(s.flags.has('snapped')).toBe(true);
    expect(available(s, snaps).sort()).toEqual([...snaps].sort());
    expect(available(s, ['coming_home', 'love', 'insult_oni'])).toEqual([]);
    perform(s, { type: 'sendChat', template: 'snap_katteni' });
    expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'demon', lines: CHAT_MAP.snap_katteni.demonLines });
  });
});

describe('妻が実家に帰っている日', () => {
  it('「気が楽」は普通の顔をした地雷。帰ると妻が実家から戻ってきている', () => {
    const s = day(['wife_away']);
    expect(CHAT_MAP.away_kiraku.disguised).toBe(true);
    expect(perform(s, { type: 'sendChat', template: 'away_kiraku' }).ok).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'angry', causes: [{ id: 'provoke:away_kiraku' }] });
  });

  it('「淋しい」「よろしく」は何も起きない（電話のペナルティもなし）', () => {
    const s = day(['wife_away']);
    expect(perform(s, { type: 'sendChat', template: 'away_samishii' }).cost).toBe(2);
    expect(perform(s, { type: 'sendChat', template: 'away_yoroshiku' }).cost).toBe(2);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('「鬼が不在だからノビノビ」は、しらふでもつぶやけてバズり、魔王', () => {
    const s = day(['wife_away']);
    expect(perform(s, { type: 'post', post: 'tw_nobinobi' }).messages[0]).toContain('バズった');
    expect(perform(s, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'demon', lines: POST_MAP.tw_nobinobi.demonLines });
  });

  it('ほかの日には出てこない。酔い3の3連投の最終形態にも数えない', () => {
    const s = day(['ring_off']);
    for (const t of ['away_kiraku', 'away_samishii', 'away_yoroshiku']) expect(perform(s, { type: 'sendChat', template: t }).ok).toBe(false);
    expect(perform(s, { type: 'post', post: 'tw_nobinobi' }).ok).toBe(false);
  });
});

describe('結婚記念日の最悪の返し', () => {
  it.each(['anniv_oboetenai', 'anniv_shiranai', 'anniv_manga'])('%s は普通の定型文の顔をして、送ると魔王', (id) => {
    expect(CHAT_MAP[id].insult).toBeFalsy();
    expect(perform(day(['ring_off']), { type: 'sendChat', template: id }).ok).toBe(false);
    const s = day(['anniversary_forgot']);
    expect(perform(s, { type: 'sendChat', template: id }).ok).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'demon', lines: CHAT_MAP[id].demonLines });
  });
});

describe('日をまたぐ異変: ノートパソコン', () => {
  /** パソコンの前振りの日を作り、相談（consult 回）してから注文して帰宅する */
  const hintDay = (consult: number) => {
    const run = newRun();
    const s = buildDay(1, [SCENARIO_MAP.ring_off, SCENARIO_MAP.pc_hint], hm(23, 0));
    s.insultIds = [];
    expect(s.introLines[0]).toContain('パソコン');
    for (const id of ['pc_soudan', 'pc_settoku_1', 'pc_settoku_2'].slice(0, consult)) expect(perform(s, { type: 'sendChat', template: id }).cost).toBe(2);
    expect(perform(s, { type: 'order', item: 'laptop' }).ok).toBe(true);
    for (const a of solve(s)!) perform(s, a);
    expect(s.successLines).toHaveLength(1); // 前振りは帰宅のセリフに数えない
    advanceRun(run, s);
    run.day = 3;
    return { run, arrival: startDay(run, seeded(7)) };
  };

  it('ノートパソコンは前振りの日だけポチッとマートで買える', () => {
    expect(perform(day(['ring_off']), { type: 'order', item: 'laptop' }).ok).toBe(false);
  });

  it('注文すると「明後日届く」（23:59 を過ぎても同じ）', () => {
    for (const t of [hm(23, 0), hm(24, 30)]) {
      const s = buildDay(1, [SCENARIO_MAP.ring_off, SCENARIO_MAP.pc_hint], t);
      const r = perform(s, { type: 'order', item: 'laptop' });
      expect(r.messages[0]).toContain('明後日届く');
      expect(s.orders.laptop).toBe('express');
    }
  });

  it('勝手に注文したあとの事後相談はできない（途中まで相談していても続きは出ない）', () => {
    const s = buildDay(1, [SCENARIO_MAP.ring_off, SCENARIO_MAP.pc_hint], hm(23, 0));
    perform(s, { type: 'sendChat', template: 'pc_soudan' });
    perform(s, { type: 'order', item: 'laptop' });
    expect(perform(s, { type: 'sendChat', template: 'pc_settoku_1' }).ok).toBe(false);
    const t = buildDay(1, [SCENARIO_MAP.ring_off, SCENARIO_MAP.pc_hint], hm(23, 0));
    perform(t, { type: 'order', item: 'laptop' });
    expect(perform(t, { type: 'sendChat', template: 'pc_soudan' }).ok).toBe(false);
  });

  it('相談して許してもらってから注文すれば、2日後に届いた日にお礼を言えば済む', () => {
    const { run, arrival } = hintDay(3);
    expect(run.pc).toEqual({ arriveDay: 3, approved: true });
    expect(arrival.scenarioIds).toContain('pc_delivery');
    expect(arrival.homeAlone).toBe(false);
    const plan = solve(arrival)!;
    expect(plan.some((a) => a.type === 'sendChat' && a.template === 'pc_arrived')).toBe(true);
    let kind = 'continue';
    for (const a of plan) kind = perform(arrival, a).outcome.kind;
    expect(kind).toBe('home');
  });

  it.each([0, 2])('相談が足りないまま注文すると（相談 %i 回）、届いた日はどうやっても炎上', (consult) => {
    const { run, arrival } = hintDay(consult);
    expect(run.pc?.approved).toBe(false);
    expect(arrival.scenarioIds).toContain('pc_surprise');
    expect(solve(arrival)).toBeNull();
    expect(perform(arrival, { type: 'sendChat', template: 'pc_arrived' }).ok).toBe(false);
    arrival.location = 'door';
    expect(perform(arrival, { type: 'openDoor' }).outcome).toMatchObject({ kind: 'angry', causes: expect.arrayContaining([expect.objectContaining({ id: 'pc_surprise' })]) });
  });

  it('前振りは1周に1回、6日目までに出る', () => {
    let hinted = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = seeded(seed);
      const run = newRun();
      let count = 0;
      for (let d = 1; d <= GOAL_DAYS; d++) {
        const s = startDay(run, rng);
        if (s.scenarioIds.includes('pc_hint')) {
          count++;
          expect(d).toBeLessThanOrEqual(GOAL_DAYS - 2);
          expect(s.homeAlone).toBe(false);
        }
        advanceRun(run, s);
      }
      expect(count).toBeLessThanOrEqual(1);
      hinted += count;
    }
    expect(hinted).toBeGreaterThan(10);
  });
});

describe('鬼のお面', () => {
  const withMask = (ids: string[]) => {
    const s = day(ids, hm(23, 0));
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    s.location = 'konbini';
    expect(perform(s, { type: 'buy', item: 'oni_mask' }).ok).toBe(true);
    s.location = 'door';
    return s;
  };

  it('異変なしの日に持って帰ると、いったん迎えられてから鬼', () => {
    const o = perform(withMask(['neighbor_curry']), { type: 'openDoor' }).outcome;
    expect(o).toMatchObject({ kind: 'angry', causes: [{ id: 'oni_mask' }] });
    if (o.kind === 'angry') expect(o.fakeHome?.length).toBeGreaterThan(0);
  });

  it('火種を全部消していても持って帰ると鬼。火種が残っていれば、いきなり鬼', () => {
    expect(perform(withMask(['ring_off']), { type: 'openDoor' }).outcome).toMatchObject({ kind: 'angry', causes: [{ id: 'oni_mask' }] });
    const s = day(['ring_off'], hm(23, 0));
    s.location = 'konbini';
    perform(s, { type: 'buy', item: 'oni_mask' });
    s.location = 'door';
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o).toMatchObject({ kind: 'angry', causes: [{ id: 'oni_mask' }, { id: 'ring_off' }] });
    if (o.kind === 'angry') expect(o.fakeHome).toBeUndefined();
  });

  it('魔王が優先。捨ててから帰れば大丈夫', () => {
    const s = withMask(['neighbor_curry']);
    perform(s, { type: 'sendChat', template: 'insult_oni' });
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('demon');
    const t = withMask(['neighbor_curry']);
    t.location = 'trash';
    perform(t, { type: 'discard', item: 'oni_mask' });
    t.location = 'door';
    expect(perform(t, { type: 'openDoor' }).outcome.kind).toBe('home');
  });
});

describe('暴言のランダム選択', () => {
  it('暴言は全部で10種あり、毎日そのうち4つが日ごとに変わる', () => {
    const all = CHAT_TEMPLATES.filter((t) => t.insult);
    expect(all).toHaveLength(10);
    const sets = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const s = buildDay(1, [SCENARIO_MAP.neighbor_curry], hm(23, 0), i / 40);
      expect(s.insultIds).toHaveLength(4);
      for (const id of s.insultIds) expect(CHAT_MAP[id]?.insult).toBe(true);
      sets.add(s.insultIds.join());
    }
    expect(sets.size).toBeGreaterThan(10);
  });

  it('その日に選ばれていない暴言は送れず、選ばれた4つを全部送るとフィナーレ', () => {
    const s = buildDay(1, [SCENARIO_MAP.neighbor_curry], hm(23, 0), 0.37);
    const off = CHAT_TEMPLATES.find((t) => t.insult && !s.insultIds.includes(t.id))!;
    expect(perform(s, { type: 'sendChat', template: off.id }).ok).toBe(false);
    for (const id of s.insultIds) expect(perform(s, { type: 'sendChat', template: id }).ok).toBe(true);
    expect(s.finale).toBeDefined();
  });

  it('暴言にはどれも酔いの3段階と魔王のセリフがある', () => {
    for (const t of CHAT_TEMPLATES.filter((x) => x.insult)) {
      expect(t.drunkText, t.id).toHaveLength(3);
      expect(t.demonLines?.length, t.id).toBeGreaterThan(1);
    }
  });
});

describe('魔王城でお酒を使う', () => {
  const opt = (label: string) => FINALES.castle.choice!.options.find((o) => o.label === label)!;
  it('缶ビール・カップ清酒・スピリタスは「どうぐ」の中にある、持っているときだけ出る選択肢', () => {
    expect(opt('どうぐ').tools).toBe(true);
    for (const [label, item] of [['かんビール', 'beer'], ['カップざけ', 'cup_sake'], ['スピリタス', 'spirytus']]) {
      expect(opt(label).item).toBe(item);
      expect(ITEM_MAP[item]).toBeDefined();
    }
  });
  it('カップ清酒は暴言5種のどれかを吐いて、一発でこころのHPが尽きる', () => {
    const sake = opt('カップざけ');
    expect(sake.replies).toHaveLength(5);
    expect(sake.selfDamage!).toBeGreaterThanOrEqual(FINALES.castle.choice!.hp!);
    expect(sake.selfDamage!).toBeGreaterThanOrEqual(FINALES.castle.finalForm!.hp);
  });
  it('スピリタスは魔王を酔わせて、反撃が強くなる', () => {
    expect(opt('スピリタス').enrage).toBe(true);
    const max = (cs: { damage: number }[]) => Math.max(...cs.map((c) => c.damage));
    const avg = (cs: { damage: number }[]) => cs.reduce((a, c) => a + c.damage, 0) / cs.length;
    expect(avg(FINALES.castle.choice!.drunkCounters!)).toBeGreaterThan(avg(FINALES.castle.choice!.counters!));
    expect(max(FINALES.castle.choice!.drunkCounters!)).toBeGreaterThan(0);
  });
});

describe('暴言4種コンプリートのフィナーレ', () => {
  const withSeed = (finale: FinaleId, ids = ['neighbor_curry']) => {
    const s = day(ids);
    s.seed = finaleSeed(finale);
    return s;
  };

  it('暴言が3つまでなら魔王、4つ全部ならフィナーレ', () => {
    const s = withSeed('court');
    for (const t of CLASSIC_INSULTS.slice(0, 3)) perform(s, { type: 'sendChat', template: t });
    expect(s.finale).toBeUndefined();
    perform(s, { type: 'sendChat', template: CLASSIC_INSULTS[3] });
    expect(s.finale).toBe('court');
    const r = perform(s, { type: 'openDoor' });
    expect(r.outcome).toEqual({ kind: 'finale', finale: 'court' });
  });

  it('スーパー夫婦大戦: 主人公の攻撃はノーダメージ、妻の必殺技で HP 0 になって撃墜される', () => {
    const b = FINALES.robot.battle!;
    const zero = b.steps.find((x) => x.damage?.to === 'wife');
    expect(zero?.damage?.value).toBe(0);
    const fin = b.steps.find((x) => x.anim === 'finisher');
    expect(fin?.heroHp).toBe(0);
    expect(b.steps.findIndex((x) => x.anim === 'shotdown')).toBeGreaterThan(b.steps.indexOf(fin!));
  });

  it('7本すべてが seed で選ばれうる', () => {
    for (const id of FINALE_IDS) {
      const s = withSeed(id);
      for (const t of CLASSIC_INSULTS) perform(s, { type: 'sendChat', template: t });
      expect(s.finale).toBe(id);
    }
  });

  it('魔王城: 4つ目を送った瞬間にスマホが割れて、以後スマホは使えない', () => {
    const s = withSeed('castle');
    for (const t of CLASSIC_INSULTS) perform(s, { type: 'sendChat', template: t });
    expect(s.flags.has('phone_broken')).toBe(true);
    expect(perform(s, { type: 'openApp', app: 'chat' }).ok).toBe(false);
    expect(perform(s, { type: 'order', item: 'bouquet' }).ok).toBe(false);
  });

  it('魔王城: 街にいても玄関前へワープさせられ、結界で引き返せない', () => {
    const s = withSeed('castle');
    s.location = 'konbini';
    const msgs = CLASSIC_INSULTS.flatMap((t) => perform(s, { type: 'sendChat', template: t }).messages);
    expect(s.location).toBe('door');
    expect(msgs.join()).toContain('玄関の前に立っていた');
    const t0 = s.time;
    const r1 = perform(s, { type: 'travel', to: 'town' });
    const r2 = perform(s, { type: 'travel', to: 'town' });
    expect(r1.ok).toBe(false);
    expect(r1.messages.join()).toContain('結界');
    expect(r2.messages).not.toEqual(r1.messages);
    expect(s.location).toBe('door');
    expect(s.time).toBe(t0);
    expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'finale', finale: 'castle' });
  });

  it('魔王城以外のフィナーレでは引き返せる', () => {
    const s = withSeed('court');
    for (const t of CLASSIC_INSULTS) perform(s, { type: 'sendChat', template: t });
    expect(perform(s, { type: 'travel', to: 'town' }).ok).toBe(true);
  });

  it('家庭裁判: どのコマンドを選んでも、信頼度が尽きて必ず有罪になる', () => {
    const c = FINALES.court.choice!;
    expect(c.options.every((o) => !o.end)).toBe(true);
    expect(Math.min(...c.counters!.map((x) => x.damage))).toBeGreaterThan(0);
    expect(c.knockout!.some((l) => l.fx === 'guilty')).toBe(true);
  });

  it('包囲網: 4つ目を送った瞬間に義母・義父・友達・上司の通知が届く', () => {
    const s = withSeed('siege');
    const before = visibleClues(s, 'notice').length;
    for (const t of CLASSIC_INSULTS) perform(s, { type: 'sendChat', template: t });
    expect(visibleClues(s, 'notice').length).toBe(before + 4);
  });

  it('フィナーレが決まった日は、時間切れでもフィナーレ', () => {
    const s = withSeed('lockout');
    s.time = hm(24, 50);
    for (const t of CLASSIC_INSULTS) perform(s, { type: 'sendChat', template: t });
    expect(perform(s, { type: 'travel', to: 'town' }).outcome).toEqual({ kind: 'finale', finale: 'lockout' });
  });
});

describe('周回', () => {
  it('日が進むほど原因が重なる（6日目以降は2つ、8日目は3つ）', () => {
    const rng = seeded(1);
    const counts = [6, 7, 8].map((d) => chooseScenarios({ day: d, used: [], streak: 0 }, rng).flatMap((s) => s.causes).length);
    expect(counts).toEqual([2, 2, 3]);
  });

  it.each([1, 2, 3, 4, 5, 42, 99, 2024])('seed %i: 8日間、重複なしで全日クリアできる', (seed) => {
    const rng = seeded(seed);
    const run = newRun();
    let cleared = false;
    while (!cleared) {
      const state = startDay(run, rng);
      const plan = solve(state)!;
      let kind = 'continue';
      for (const a of plan) {
        kind = perform(state, a).outcome.kind;
        if (kind !== 'continue') break;
      }
      expect(kind, `${run.day}日目 ${state.scenarioIds.join('+')}`).toBe('home');
      cleared = advanceRun(run);
    }
    expect(run.streak).toBe(GOAL_DAYS);
    expect(new Set(run.used).size).toBe(run.used.length);
  });
});
