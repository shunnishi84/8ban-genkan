/**
 * アセットのファイル名を一元管理する。
 * 画像は public/assets/images/、音声は public/assets/audio/ に置けば自動で使われる。
 * ファイルが無い場合、画像は「仮の四角＋ラベル」、効果音は簡易ビープ、BGM は無音になる。
 * 玄関前での描画位置は renderer.ts の SPOT_RECTS / OVERLAY_RECTS で決める。
 */

export interface ImageEntry {
  file: string;
  /** 画像が無いときに四角の中に出すラベル */
  label: string;
  /** 代替表示の塗り色 */
  color: string;
  /** cover: 縦横比を保って全面を覆う（はみ出しは切る）。省略時は矩形に引き伸ばす */
  fit?: 'cover';
}

export const IMAGES = {
  // --- 玄関前（bg_door は 224x367 の一枚絵。各パーツの当たり判定は renderer.ts の SPOT_RECTS） ---
  bg_door: { file: 'bg_door.png', label: 'マンション廊下（夜）', color: '#2a2f3a' },
  bg_door_dark: { file: 'bg_door_dark.png', label: '玄関前（消灯）', color: '#161a22', fit: 'cover' },
  // 個別パーツ。bg_door が一枚絵として読めているときは、ファイルがあれば上に重ねるだけ（無ければ描かない）
  door: { file: 'door.png', label: 'ドア', color: '#6b4a32' },
  window: { file: 'window.png', label: '窓', color: '#e7d98a' },
  nameplate: { file: 'nameplate.png', label: '表札', color: '#c9c2b0' },
  floor: { file: 'floor.png', label: '玄関マット', color: '#5a5048' },
  hallway: { file: 'hallway.png', label: '廊下', color: '#3a4150' },
  // --- 玄関前のオーバーレイ（Scenario.visuals / Pickup.visual で指定） ---
  window_garland: { file: 'window_garland.png', label: 'HAPPY BIRTHDAY', color: '#f39ac2' },
  window_candle: { file: 'window_candle.png', label: 'キャンドル', color: '#ffb347' },
  window_dark: { file: 'window_dark.png', label: '消灯', color: '#11151d' },
  window_tv: { file: 'window_tv.png', label: 'テレビの光', color: '#5b8fd9' },
  garbage_bag: { file: 'garbage_bag.png', label: 'ゴミ袋', color: '#9fb4c7' },
  wet_floor: { file: 'wet_floor.png', label: '水たまり', color: '#4a79a8' },
  /** フィナーレ「魔王城」: ドアに重ねる魔王城の門（ドアの位置に描く） */
  castle_gate: { file: 'castle_gate.png', label: '魔王城の門', color: '#3a1458' },
  // --- 街 ---
  bg_title: { file: 'bg_title.png', label: '8番玄関', color: '#10141c', fit: 'cover' },
  bg_town: { file: 'bg_town.jpg', label: '夜の街', color: '#1d2333', fit: 'cover' },
  bg_konbini: { file: 'bg_konbini.png', label: 'コンビニ店内', color: '#dfe9e4', fit: 'cover' },
  bg_trash: { file: 'bg_trash.jpg', label: 'ゴミ捨て場', color: '#38403a', fit: 'cover' },
  bg_bench: { file: 'bg_bench.jpg', label: '公園のベンチ', color: '#25352a', fit: 'cover' },
  // --- 人物・結末 ---
  hero: { file: 'hero.png', label: '主人公', color: '#4b5a74' },
  wife_angry: { file: 'wife_angry.png', label: '鬼の形相の妻', color: '#7a1010', fit: 'cover' },
  wife_dark: { file: 'wife_dark.png', label: '無言の妻', color: '#2b2b38', fit: 'cover' },
  wife_smile: { file: 'wife_smile.png', label: 'おかえりの妻', color: '#f2c6a0', fit: 'cover' },
  wife_sullen: { file: 'wife_sullen.jpg', label: '渋々許す妻', color: '#d8c2b0', fit: 'cover' },
  // 妻が酔っている日（無ければ通常の妻の絵で代用）
  wife_drunk_karami: { file: 'wife_drunk_karami.jpg', label: 'からみ酒の妻', color: '#a03040', fit: 'cover' },
  wife_drunk_amae: { file: 'wife_drunk_amae.jpg', label: '甘え上戸の妻', color: '#f2a7c3', fit: 'cover' },
  wife_drunk_sleep: { file: 'wife_drunk_sleep.jpg', label: '玄関で寝落ちした妻', color: '#2b2b38', fit: 'cover' },
  drunk_party: { file: 'drunk_party.jpg', label: '夫婦で宴会', color: '#c98a4a', fit: 'cover' },
  /** 暴言を送った日の結末: 邪悪なオーラを放つ魔王化した妻（無ければ wife_angry を紫に染めて代用） */
  // 3:4 の一枚絵。隅の正座する夫まで見せるため、cover ではなく横幅いっぱいで描く（renderer.ts の drawDemon）
  wife_demon: { file: 'wife_demon.jpg', label: '魔王化した妻', color: '#2a0640' },
  wife_demon_final: { file: 'wife_demon_final.jpg', label: '魔王（最終形態）', color: '#40060a' },
  wife_suspicious: { file: 'wife_suspicious.png', label: '腕組みの妻', color: '#5a4a4a', fit: 'cover' },
  /** wife_angry に炎が描き込まれていれば不要 */
  fire: { file: 'fire.png', label: '炎', color: '#ff5a1f' },
  // --- フィナーレの背景（無ければ bg_door_dark で代用） ---
  bg_court: { file: 'bg_court.jpg', label: '家庭裁判所', color: '#3b2a1e', fit: 'cover' },
  // 家庭裁判のカメラ切り替え（話している人の席を映す）。無ければ bg_court
  bg_court_judge: { file: 'bg_court_judge.jpg', label: '裁判長席', color: '#3b2a1e', fit: 'cover' },
  bg_court_defense: { file: 'bg_court_defense.jpg', label: '弁護席', color: '#3b2a1e', fit: 'cover' },
  bg_court_prosecutor: { file: 'bg_court_prosecutor.jpg', label: '検察席', color: '#3b2a1e', fit: 'cover' },
  bg_court_witness: { file: 'bg_court_witness.jpg', label: '証言台', color: '#3b2a1e', fit: 'cover' },
  bg_siege: { file: 'bg_siege.jpg', label: '家族会議', color: '#2d2a33', fit: 'cover' },
  bg_lockout: { file: 'bg_lockout.jpg', label: '締め出し', color: '#161a22', fit: 'cover' },
  bg_exposed: { file: 'bg_exposed.jpg', label: 'マンション総出', color: '#1d2333', fit: 'cover' },
  clear: { file: 'clear.jpg', label: '8日連続 帰宅成功！', color: '#f7d774', fit: 'cover' },
  // --- 持ち物・手がかりのイラスト（UI 内に表示。無ければ出さない） ---
  shirt_clean: { file: 'shirt_clean.png', label: 'ワイシャツ', color: '#eeeeee' },
  shirt_lipstick: { file: 'shirt_lipstick.png', label: '口紅つきシャツ', color: '#f3d3d3' },
  item_card: { file: 'item_card.png', label: '名刺', color: '#e0409a' },
  item_receipt: { file: 'item_receipt.png', label: 'レシート', color: '#f4f4f4' },
  item_bouquet: { file: 'item_bouquet.png', label: '花束', color: '#9fd39b' },
  item_shopping_bag: { file: 'item_shopping_bag.png', label: 'レジ袋', color: '#e8e0cc' },
  item_cake: { file: 'item_cake.png', label: 'ケーキ', color: '#f6d6dc' },
  item_ice_cream: { file: 'item_ice_cream.png', label: 'アイス', color: '#f3ead2' },
  item_glue: { file: 'item_glue.png', label: '接着剤', color: '#e2c23a' },
  item_broken_mug: { file: 'item_broken_mug.png', label: '割れたマグ', color: '#4f78b8' },
  item_fixed_mug: { file: 'item_fixed_mug.png', label: '直したマグ', color: '#4f78b8' },
  item_onsen_ticket: { file: 'item_onsen_ticket.png', label: '温泉ギフト', color: '#c9a86a' },
  item_golf_club: { file: 'item_golf_club.png', label: 'ゴルフクラブ', color: '#8a8f99' },
  item_empty_can: { file: 'item_empty_can.png', label: '空き缶', color: '#b7c4cf' },
  item_ring: { file: 'item_ring.png', label: '指輪', color: '#e7d27a' },
  item_mint: { file: 'item_mint.png', label: 'ミント', color: '#9fe0d0' },
  // 2回目のアイコンシート（コンビニ8種・通販など8種）
  item_sweets: { file: 'item_sweets.png', label: 'ロールケーキ', color: '#f1e2c8' },
  item_wine: { file: 'item_wine.png', label: 'ワイン', color: '#7a1d2e' },
  item_konbini_pudding: { file: 'item_konbini_pudding.png', label: 'プリン', color: '#f0d27a' },
  item_navy_tie: { file: 'item_navy_tie.png', label: 'ネクタイ', color: '#2a3a6a' },
  item_detergent_generic: { file: 'item_detergent_generic.png', label: '洗剤（安物）', color: '#9fc3e6' },
  item_vinyl_umbrella: { file: 'item_vinyl_umbrella.png', label: 'ビニール傘', color: '#d9e6ee' },
  item_snack_box: { file: 'item_snack_box.png', label: 'お菓子箱', color: '#e7b25a' },
  item_beer: { file: 'item_beer.png', label: '缶ビール', color: '#e2b93b' },
  item_cup_sake: { file: 'item_cup_sake.png', label: 'カップ清酒', color: '#c9d6e6' },
  item_spirytus: { file: 'item_spirytus.png', label: 'スピリタス', color: '#d8dde2' },
  item_milk: { file: 'item_milk.png', label: '牛乳', color: '#7ab8e2' },
  item_eggs: { file: 'item_eggs.png', label: '卵', color: '#f2f2ee' },
  item_detergent_refill: { file: 'item_detergent_refill.png', label: '洗剤（指定）', color: '#7ec8a0' },
  item_pair_glass: { file: 'item_pair_glass.png', label: 'ペアグラス', color: '#cfe3f0' },
  item_umbrella_same: { file: 'item_umbrella_same.png', label: '花柄傘', color: '#f2a7c3' },
  item_limited_pudding: { file: 'item_limited_pudding.png', label: '限定プリン', color: '#e9c46a' },
  item_kashiori: { file: 'item_kashiori.png', label: '菓子折り', color: '#b5523b' },
  item_spa_ticket: { file: 'item_spa_ticket.png', label: 'スパ券', color: '#c9a86a' },
  item_av_subscription: { file: 'item_av_subscription.png', label: '月額プラン', color: '#3a2d5c' },
  item_gravure_book: { file: 'item_gravure_book.png', label: '写真集', color: '#5fb7d4' },
  item_saru_recipe: { file: 'item_saru_recipe.png', label: '料理本', color: '#f2b03a' },
  // 手がかりに添えるイラスト
  tv_capture: { file: 'tv_capture.jpg', label: 'テレビの画面', color: '#33415c' },
  kouhai_notice: { file: 'kouhai_notice.jpg', label: '後輩の通知', color: '#f2a7c3' },
  group_photo: { file: 'group_photo.jpg', label: '飲み会の集合写真', color: '#c98a4a' },
  gravure_page: { file: 'gravure_page.jpg', label: '付箋のページ', color: '#5fb7d4' },
  // 酔った勢いの悪ふざけの結末（無ければ既存の絵で代用）
  prank_police: { file: 'prank_police.jpg', label: '妻とおまわりさん', color: '#2b2b38', fit: 'cover' },
  prank_mummy: { file: 'prank_mummy.jpg', label: '包帯ぐるぐる巻き', color: '#e8e0cc', fit: 'cover' },
  prank_tears: { file: 'prank_tears.jpg', label: '泣いている妻', color: '#3a3f55', fit: 'cover' },
  hospital_wife: { file: 'hospital_wife.jpg', label: '病室で怒る妻', color: '#d8dde2', fit: 'cover' },
  // スーパー夫婦大戦（ロボット大戦風フィナーレ）。背景が無ければ夜の街
  bg_battle: { file: 'bg_battle.jpg', label: '戦闘背景', color: '#1d2333', fit: 'cover' },
  robot_hero: { file: 'robot_hero.png', label: 'サラリーマンガーZ', color: '#8a96a8' },
  robot_wife: { file: 'robot_wife.png', label: 'グレートワイフ', color: '#c0405a' },
  pilot_hero: { file: 'pilot_hero.png', label: 'ダンナ', color: '#4b5a74' },
  pilot_wife: { file: 'pilot_wife.png', label: 'ヨメ', color: '#7a1010' },
} satisfies Record<string, ImageEntry>;

/** アイテムID → 一覧に出すイラスト */
export const ITEM_ICONS: Partial<Record<string, ImageKey>> = {
  spare_shirt: 'shirt_clean',
  cabaret_card: 'item_card',
  cabaret_receipt: 'item_receipt',
  ramen_receipt: 'item_receipt',
  bouquet: 'item_bouquet',
  milk: 'item_milk',
  eggs: 'item_eggs',
  cake: 'item_cake',
  ice_cream: 'item_ice_cream',
  glue: 'item_glue',
  broken_mug: 'item_broken_mug',
  fixed_mug: 'item_fixed_mug',
  golf_club: 'item_golf_club',
  empty_can: 'item_empty_can',
  ring: 'item_ring',
  mint: 'item_mint',
  garbage_bag: 'garbage_bag',
  onsen_ticket: 'item_onsen_ticket',
  sweets: 'item_sweets',
  wine: 'item_wine',
  konbini_pudding: 'item_konbini_pudding',
  navy_tie: 'item_navy_tie',
  detergent_generic: 'item_detergent_generic',
  vinyl_umbrella: 'item_vinyl_umbrella',
  snack_box: 'item_snack_box',
  beer: 'item_beer',
  cup_sake: 'item_cup_sake',
  spirytus: 'item_spirytus',
  detergent_refill: 'item_detergent_refill',
  pair_glass: 'item_pair_glass',
  umbrella_same: 'item_umbrella_same',
  limited_pudding: 'item_limited_pudding',
  kashiori: 'item_kashiori',
  spa_ticket: 'item_spa_ticket',
  av_subscription: 'item_av_subscription',
  gravure_book: 'item_gravure_book',
  saru_recipe: 'item_saru_recipe',
};

export type ImageKey = keyof typeof IMAGES;

interface AudioEntry {
  file: string;
  /** ファイルが無い効果音の代わりに鳴らすビープの周波数（Hz）。BGM は無音 */
  beep?: number;
  volume?: number;
}

export const BGM = {
  bgm_title: { file: 'bgm_title.mp3', volume: 0.5 },
  bgm_door: { file: 'bgm_door.mp3', volume: 0.4 },
  bgm_town: { file: 'bgm_town.mp3', volume: 0.4 },
  bgm_angry: { file: 'bgm_angry.mp3', volume: 0.6 },
  bgm_demon: { file: 'bgm_demon.mp3', volume: 0.7 },
  bgm_home: { file: 'bgm_home.mp3', volume: 0.5 },
  bgm_clear: { file: 'bgm_clear.mp3', volume: 0.6 },
} satisfies Record<string, AudioEntry>;

export const SE = {
  se_tap: { file: 'se_tap.mp3', beep: 880, volume: 0.3 },
  se_open: { file: 'se_open.mp3', beep: 660, volume: 0.3 },
  se_send: { file: 'se_send.mp3', beep: 990, volume: 0.4 },
  se_buy: { file: 'se_buy.mp3', beep: 1320, volume: 0.4 },
  se_order: { file: 'se_order.mp3', beep: 1180, volume: 0.4 },
  se_discard: { file: 'se_discard.mp3', beep: 330, volume: 0.4 },
  se_walk: { file: 'se_walk.mp3', beep: 220, volume: 0.3 },
  se_phone_call: { file: 'se_phone_call.mp3', beep: 520, volume: 0.5 },
  se_door: { file: 'se_door.mp3', beep: 180, volume: 0.6 },
  se_angry: { file: 'se_angry.mp3', beep: 110, volume: 0.7 },
  se_success: { file: 'se_success.mp3', beep: 1040, volume: 0.5 },
  se_late: { file: 'se_late.mp3', beep: 150, volume: 0.6 },
  se_demon: { file: 'se_demon.mp3', beep: 70, volume: 0.8 },
  // 家庭裁判（逆転裁判風）
  se_objection: { file: 'se_objection.mp3', beep: 1480, volume: 0.6 },
  se_gavel: { file: 'se_gavel.mp3', beep: 240, volume: 0.6 },
  se_slam: { file: 'se_slam.mp3', beep: 90, volume: 0.7 },
  se_penalty: { file: 'se_penalty.mp3', beep: 160, volume: 0.6 },
  se_guilty: { file: 'se_guilty.mp3', beep: 60, volume: 0.8 },
} satisfies Record<string, AudioEntry>;

export type BgmKey = keyof typeof BGM;
export type SeKey = keyof typeof SE;

export const IMAGE_DIR = 'assets/images/';
export const AUDIO_DIR = 'assets/audio/';
