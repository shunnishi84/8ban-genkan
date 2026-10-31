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
  // --- 玄関前（bg_door は縦横比 224:367 の一枚絵。各パーツの当たり判定は renderer.ts の SPOT_RECTS） ---
  bg_door: { file: 'bg_door.webp', label: 'マンション廊下（夜）', color: '#2a2f3a' },
  bg_door_dark: { file: 'bg_door_dark.webp', label: '玄関前（消灯）', color: '#161a22', fit: 'cover' },
  // 個別パーツ。bg_door が一枚絵として読めているときは、ファイルがあれば上に重ねるだけ（無ければ描かない）
  door: { file: 'door.png', label: 'ドア', color: '#6b4a32' },
  window: { file: 'window.png', label: '窓', color: '#e7d98a' },
  nameplate: { file: 'nameplate.png', label: '表札', color: '#c9c2b0' },
  floor: { file: 'floor.png', label: '玄関マット', color: '#5a5048' },
  hallway: { file: 'hallway.png', label: '廊下', color: '#3a4150' },
  // --- 玄関前のオーバーレイ（Scenario.visuals / Pickup.visual で指定） ---
  window_garland: { file: 'window_garland.webp', label: 'HAPPY BIRTHDAY', color: '#f39ac2' },
  window_candle: { file: 'window_candle.webp', label: 'キャンドル', color: '#ffb347' },
  window_dark: { file: 'window_dark.webp', label: '消灯', color: '#11151d' },
  window_tv: { file: 'window_tv.webp', label: 'テレビの光', color: '#5b8fd9' },
  garbage_bag: { file: 'garbage_bag.webp', label: 'ゴミ袋', color: '#9fb4c7' },
  wet_floor: { file: 'wet_floor.webp', label: '水たまり', color: '#4a79a8' },
  /** フィナーレ「魔王城」: ドアに重ねる魔王城の門（ドアの位置に描く） */
  castle_gate: { file: 'castle_gate.webp', label: '魔王城の門', color: '#3a1458' },
  // --- 街 ---
  bg_title: { file: 'bg_title.webp', label: '8番玄関', color: '#10141c', fit: 'cover' },
  bg_town: { file: 'bg_town.webp', label: '夜の街', color: '#1d2333', fit: 'cover' },
  bg_konbini: { file: 'bg_konbini.webp', label: 'コンビニ店内', color: '#dfe9e4', fit: 'cover' },
  bg_trash: { file: 'bg_trash.webp', label: 'ゴミ捨て場', color: '#38403a', fit: 'cover' },
  bg_bench: { file: 'bg_bench.webp', label: '公園のベンチ', color: '#25352a', fit: 'cover' },
  // --- 人物・結末 ---
  hero: { file: 'hero.webp', label: '主人公', color: '#4b5a74' },
  wife_angry: { file: 'wife_angry.webp', label: '鬼の形相の妻', color: '#7a1010', fit: 'cover' },
  wife_dark: { file: 'wife_dark.webp', label: '無言の妻', color: '#2b2b38', fit: 'cover' },
  wife_smile: { file: 'wife_smile.webp', label: 'おかえりの妻', color: '#f2c6a0', fit: 'cover' },
  wife_sullen: { file: 'wife_sullen.webp', label: '渋々許す妻', color: '#d8c2b0', fit: 'cover' },
  // 妻が酔っている日（無ければ通常の妻の絵で代用）
  wife_drunk_karami: { file: 'wife_drunk_karami.webp', label: 'からみ酒の妻', color: '#a03040', fit: 'cover' },
  wife_drunk_amae: { file: 'wife_drunk_amae.webp', label: '甘え上戸の妻', color: '#f2a7c3', fit: 'cover' },
  wife_drunk_sleep: { file: 'wife_drunk_sleep.webp', label: '玄関で寝落ちした妻', color: '#2b2b38', fit: 'cover' },
  drunk_party: { file: 'drunk_party.webp', label: '夫婦で宴会', color: '#c98a4a', fit: 'cover' },
  wife_drunk_pout: { file: 'wife_drunk_pout.webp', label: 'おねだりを忘れられて泣きべその妻', color: '#c98a8a', fit: 'cover' },
  wife_laxative: { file: 'wife_laxative.webp', label: 'お腹を押さえてげっそりした妻', color: '#8a95a5', fit: 'cover' },
  wife_inlaws: { file: 'wife_inlaws.webp', label: '夫の両親の相手で限界の妻', color: '#9a7a6a', fit: 'cover' },
  /** 暴言を送った日の結末: 邪悪なオーラを放つ魔王化した妻（無ければ wife_angry を紫に染めて代用） */
  // 3:4 の一枚絵。隅の正座する夫まで見せるため、cover ではなく横幅いっぱいで描く（renderer.ts の drawDemon）
  wife_demon: { file: 'wife_demon.webp', label: '魔王化した妻', color: '#2a0640' },
  wife_demon_final: { file: 'wife_demon_final.webp', label: '魔王（最終形態）', color: '#40060a' },
  wife_kishin: { file: 'wife_kishin.webp', label: '鬼神（鬼のお面をかぶった魔王）', color: '#a0300a', fit: 'cover' },
  wife_kishin_final: { file: 'wife_kishin_final.webp', label: '鬼神・最終形態', color: '#600a05', fit: 'cover' },
  wife_suspicious: { file: 'wife_suspicious.webp', label: '腕組みの妻', color: '#5a4a4a', fit: 'cover' },
  /** wife_angry に炎が描き込まれていれば不要 */
  fire: { file: 'fire.png', label: '炎', color: '#ff5a1f' },
  // --- フィナーレの背景（無ければ bg_door_dark で代用） ---
  bg_court: { file: 'bg_court.webp', label: '家庭裁判所', color: '#3b2a1e', fit: 'cover' },
  // 家庭裁判のカメラ切り替え（話している人の席を映す）。無ければ bg_court
  bg_court_judge: { file: 'bg_court_judge.webp', label: '裁判長席', color: '#3b2a1e', fit: 'cover' },
  bg_court_defense: { file: 'bg_court_defense.webp', label: '弁護席', color: '#3b2a1e', fit: 'cover' },
  bg_court_prosecutor: { file: 'bg_court_prosecutor.webp', label: '検察席', color: '#3b2a1e', fit: 'cover' },
  bg_court_witness: { file: 'bg_court_witness.webp', label: '証言台', color: '#3b2a1e', fit: 'cover' },
  bg_siege: { file: 'bg_siege.webp', label: '家族会議', color: '#2d2a33', fit: 'cover' },
  bg_lockout: { file: 'bg_lockout.webp', label: '締め出し', color: '#161a22', fit: 'cover' },
  bg_exposed: { file: 'bg_exposed.webp', label: 'マンション総出', color: '#1d2333', fit: 'cover' },
  clear: { file: 'clear.webp', label: '8日連続 帰宅成功！', color: '#f7d774', fit: 'cover' },
  // --- 持ち物・手がかりのイラスト（UI 内に表示。無ければ出さない） ---
  shirt_clean: { file: 'shirt_clean.webp', label: 'ワイシャツ', color: '#eeeeee' },
  shirt_lipstick: { file: 'shirt_lipstick.webp', label: '口紅つきシャツ', color: '#f3d3d3' },
  item_card: { file: 'item_card.webp', label: '名刺', color: '#e0409a' },
  item_receipt: { file: 'item_receipt.webp', label: 'レシート', color: '#f4f4f4' },
  item_bouquet: { file: 'item_bouquet.webp', label: '花束', color: '#9fd39b' },
  item_shopping_bag: { file: 'item_shopping_bag.webp', label: 'レジ袋', color: '#e8e0cc' },
  item_cake: { file: 'item_cake.webp', label: 'ケーキ', color: '#f6d6dc' },
  item_ice_cream: { file: 'item_ice_cream.webp', label: 'アイス', color: '#f3ead2' },
  item_glue: { file: 'item_glue.webp', label: '接着剤', color: '#e2c23a' },
  item_broken_mug: { file: 'item_broken_mug.webp', label: '割れたマグ', color: '#4f78b8' },
  item_fixed_mug: { file: 'item_fixed_mug.webp', label: '直したマグ', color: '#4f78b8' },
  item_onsen_ticket: { file: 'item_onsen_ticket.webp', label: '温泉ギフト', color: '#c9a86a' },
  item_golf_club: { file: 'item_golf_club.webp', label: 'ゴルフクラブ', color: '#8a8f99' },
  item_empty_can: { file: 'item_empty_can.webp', label: '空き缶', color: '#b7c4cf' },
  item_ring: { file: 'item_ring.webp', label: '指輪', color: '#e7d27a' },
  item_mint: { file: 'item_mint.webp', label: 'ミント', color: '#9fe0d0' },
  // 2回目のアイコンシート（コンビニ8種・通販など8種）
  item_sweets: { file: 'item_sweets.webp', label: 'ロールケーキ', color: '#f1e2c8' },
  item_wine: { file: 'item_wine.webp', label: 'ワイン', color: '#7a1d2e' },
  item_konbini_pudding: { file: 'item_konbini_pudding.webp', label: 'プリン', color: '#f0d27a' },
  item_navy_tie: { file: 'item_navy_tie.webp', label: 'ネクタイ', color: '#2a3a6a' },
  item_detergent_generic: { file: 'item_detergent_generic.webp', label: '洗剤（安物）', color: '#9fc3e6' },
  item_vinyl_umbrella: { file: 'item_vinyl_umbrella.webp', label: 'ビニール傘', color: '#d9e6ee' },
  item_snack_box: { file: 'item_snack_box.webp', label: 'お菓子箱', color: '#e7b25a' },
  item_beer: { file: 'item_beer.webp', label: '缶ビール', color: '#e2b93b' },
  item_cup_sake: { file: 'item_cup_sake.webp', label: 'カップ清酒', color: '#c9d6e6' },
  item_spirytus: { file: 'item_spirytus.webp', label: 'スピリタス', color: '#d8dde2' },
  item_milk: { file: 'item_milk.webp', label: '牛乳', color: '#7ab8e2' },
  item_eggs: { file: 'item_eggs.webp', label: '卵', color: '#f2f2ee' },
  item_dinner_reservation: { file: 'item_dinner_reservation.webp', label: 'ペアディナー予約', color: '#8b3a3e' },
  item_laptop: { file: 'item_laptop.webp', label: 'ノートパソコン', color: '#9fb3c8' },
  item_oni_mask: { file: 'item_oni_mask.webp', label: '鬼のお面', color: '#d9463b' },
  item_pudding_premium: { file: 'item_pudding_premium.webp', label: '贅沢窯焼きプリン', color: '#e0b84a' },
  item_blouse_same: { file: 'item_blouse_same.webp', label: '同じブラウス', color: '#f4f4f4' },
  item_headspa_ticket: { file: 'item_headspa_ticket.webp', label: 'ヘッドスパ券', color: '#9cc3a5' },
  item_bento_box: { file: 'item_bento_box.webp', label: '曲げわっぱ弁当箱', color: '#d9a66b' },
  item_house_key: { file: 'item_house_key.webp', label: '家の鍵', color: '#d4b25a' },
  item_lint_roller: { file: 'item_lint_roller.webp', label: 'コロコロ', color: '#8fb8de' },
  item_strong_can: { file: 'item_strong_can.webp', label: 'ストロング缶', color: '#d8d8d8' },
  item_bill_payment: { file: 'item_bill_payment.webp', label: '払込の受領証', color: '#f4f4f4' },
  item_wife_bag: { file: 'item_wife_bag.webp', label: '妻のバッグ', color: '#d8b8a8' },
  item_seichozai: { file: 'item_seichozai.webp', label: '整腸剤', color: '#cfe3f2' },
  item_sports_drink: { file: 'item_sports_drink.webp', label: 'スポーツドリンク', color: '#7ec4ea' },
  item_bluray_ren: { file: 'item_bluray_ren.webp', label: 'ブルーレイ', color: '#2b3a5e' },
  item_ren_fanmeeting: { file: 'item_ren_fanmeeting.webp', label: 'ファンミのチケット', color: '#f5c6d6' },
  item_detergent_refill: { file: 'item_detergent_refill.webp', label: '洗剤（指定）', color: '#7ec8a0' },
  item_pair_glass: { file: 'item_pair_glass.webp', label: 'ペアグラス', color: '#cfe3f0' },
  item_umbrella_same: { file: 'item_umbrella_same.webp', label: '花柄傘', color: '#f2a7c3' },
  item_limited_pudding: { file: 'item_limited_pudding.webp', label: '限定プリン', color: '#e9c46a' },
  item_kashiori: { file: 'item_kashiori.webp', label: '菓子折り', color: '#b5523b' },
  item_spa_ticket: { file: 'item_spa_ticket.webp', label: 'スパ券', color: '#c9a86a' },
  item_av_subscription: { file: 'item_av_subscription.webp', label: '月額プラン', color: '#3a2d5c' },
  item_gravure_book: { file: 'item_gravure_book.webp', label: '写真集', color: '#5fb7d4' },
  item_saru_recipe: { file: 'item_saru_recipe.webp', label: '料理本', color: '#f2b03a' },
  // 手がかりに添えるイラスト
  tv_capture: { file: 'tv_capture.webp', label: 'テレビの画面', color: '#33415c' },
  kouhai_notice: { file: 'kouhai_notice.webp', label: '後輩の通知', color: '#f2a7c3' },
  costume_dress: { file: 'costume_dress.webp', label: '余興のアイドル衣装', color: '#f5b8d0' },
  yokyou_photo: { file: 'yokyou_photo.webp', label: '余興の練習写真', color: '#f5b8d0' },
  twoshot_edited: { file: 'twoshot_edited.webp', label: '加工されたツーショット', color: '#f2c6d8' },
  twoshot_original: { file: 'twoshot_original.webp', label: '加工前のツーショット', color: '#c8d2e0' },
  group_photo: { file: 'group_photo.webp', label: '飲み会の集合写真', color: '#c98a4a' },
  gravure_page: { file: 'gravure_page.webp', label: '付箋のページ', color: '#5fb7d4' },
  clue_pink_blouse: { file: 'clue_pink_blouse.webp', label: 'ピンクに染まったブラウス', color: '#f2b6c6' },
  clue_pudding_lid: { file: 'clue_pudding_lid.webp', label: '名前入りのプリンのふた', color: '#e8c76a' },
  clue_tsuno_post: { file: 'clue_tsuno_post.webp', label: '鬼の角の落書き', color: '#d9463b' },
  clue_moldy_bento: { file: 'clue_moldy_bento.webp', label: 'カビた弁当箱', color: '#8fae6b' },
  clue_tissue_laundry: { file: 'clue_tissue_laundry.webp', label: 'ティッシュまみれの洗濯物', color: '#2a3048' },
  clue_health_check: { file: 'clue_health_check.webp', label: '健康診断の結果', color: '#f4e9a6' },
  clue_payment_slip: { file: 'clue_payment_slip.webp', label: '払込用紙の封筒', color: '#dfe8f2' },
  tv_satou_capture: { file: 'tv_satou_capture.webp', label: 'テレビの社内恋愛宣言', color: '#2a1f3a' },
  clue_laxative: { file: 'clue_laxative.webp', label: '下剤の箱', color: '#5a6a7a' },
  clue_rokuga_fail: { file: 'clue_rokuga_fail.webp', label: '録画失敗の画面', color: '#dfe6ec' },
  clue_oshi_live: { file: 'clue_oshi_live.webp', label: 'ライブレポの写真', color: '#c03a9a' },
  // 酔った勢いの悪ふざけの結末（無ければ既存の絵で代用）
  prank_police: { file: 'prank_police.webp', label: '妻とおまわりさん', color: '#2b2b38', fit: 'cover' },
  prank_mummy: { file: 'prank_mummy.webp', label: '包帯ぐるぐる巻き', color: '#e8e0cc', fit: 'cover' },
  prank_tears: { file: 'prank_tears.webp', label: '泣いている妻', color: '#3a3f55', fit: 'cover' },
  hospital_wife: { file: 'hospital_wife.webp', label: '病室で怒る妻', color: '#d8dde2', fit: 'cover' },
  police_patrol: { file: 'police_patrol.webp', label: '巡回中のお巡りさん', color: '#1f2a44', fit: 'cover' },
  police_konbini: { file: 'police_konbini.webp', label: 'コンビニに来たお巡りさん', color: '#dfe6ec', fit: 'cover' },
  ol_scream: { file: 'ol_scream.webp', label: '悲鳴をあげる OL', color: '#2b2b38', fit: 'cover' },
  koban_wife: { file: 'koban_wife.webp', label: '交番に迎えに来た妻', color: '#d8d2c0', fit: 'cover' },
  jail_cell: { file: 'jail_cell.webp', label: '留置場', color: '#3a3d44', fit: 'cover' },
  jail_visit: { file: 'jail_visit.webp', label: '留置場の面会室の妻', color: '#3a3d44', fit: 'cover' },
  // スーパー夫婦大戦（ロボット大戦風フィナーレ）。背景が無ければ夜の街
  bg_battle: { file: 'bg_battle.webp', label: '戦闘背景', color: '#1d2333', fit: 'cover' },
  robot_hero: { file: 'robot_hero.webp', label: 'サラリーマンガーZ', color: '#8a96a8' },
  robot_wife: { file: 'robot_wife.webp', label: 'グレートワイフ', color: '#c0405a' },
  pilot_hero: { file: 'pilot_hero.webp', label: 'ダンナ', color: '#4b5a74' },
  pilot_wife: { file: 'pilot_wife.webp', label: 'ヨメ', color: '#7a1010' },
} satisfies Record<string, ImageEntry>;

/** アイテムID → 一覧に出すイラスト */
export const ITEM_ICONS: Partial<Record<string, ImageKey>> = {
  spare_shirt: 'shirt_clean',
  worn_shirt: 'shirt_clean',
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
  dinner_reservation: 'item_dinner_reservation',
  laptop: 'item_laptop',
  oni_mask: 'item_oni_mask',
  pudding_premium: 'item_pudding_premium',
  blouse_same: 'item_blouse_same',
  headspa_ticket: 'item_headspa_ticket',
  bento_box: 'item_bento_box',
  house_key: 'item_house_key',
  lint_roller: 'item_lint_roller',
  strong_can: 'item_strong_can',
  bill_payment: 'item_bill_payment',
  wife_bag: 'item_wife_bag',
  seichozai: 'item_seichozai',
  sports_drink: 'item_sports_drink',
  bluray_ren: 'item_bluray_ren',
  ren_fanmeeting: 'item_ren_fanmeeting',
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
