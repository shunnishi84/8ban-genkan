/**
 * アセットのファイル名を一元管理する。
 * 画像は public/assets/images/、音声は public/assets/audio/ に置けば自動で使われる。
 * ファイルが無い場合、画像は「仮の四角＋ラベル」、効果音は簡易ビープ、BGM は無音になる。
 *
 * rect は 360x640 の論理座標上の描画位置。画像はこの矩形に引き伸ばして描く。
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
  wife_suspicious: { file: 'wife_suspicious.png', label: '腕組みの妻', color: '#5a4a4a', fit: 'cover' },
  /** wife_angry に炎が描き込まれていれば不要 */
  fire: { file: 'fire.png', label: '炎', color: '#ff5a1f' },
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
  // 手がかりに添えるイラスト
  tv_capture: { file: 'tv_capture.png', label: 'テレビの画面', color: '#33415c' },
  kouhai_notice: { file: 'kouhai_notice.png', label: '後輩の通知', color: '#f2a7c3' },
} satisfies Record<string, ImageEntry>;

/** アイテムID → 一覧に出すイラスト */
export const ITEM_ICONS: Partial<Record<string, ImageKey>> = {
  spare_shirt: 'shirt_clean',
  cabaret_card: 'item_card',
  cabaret_receipt: 'item_receipt',
  ramen_receipt: 'item_receipt',
  bouquet: 'item_bouquet',
  milk: 'item_shopping_bag',
  eggs: 'item_shopping_bag',
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
};

export type ImageKey = keyof typeof IMAGES;

export interface AudioEntry {
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
} satisfies Record<string, AudioEntry>;

export type BgmKey = keyof typeof BGM;
export type SeKey = keyof typeof SE;

export const IMAGE_DIR = 'assets/images/';
export const AUDIO_DIR = 'assets/audio/';
