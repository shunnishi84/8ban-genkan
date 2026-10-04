import { IMAGE_DIR, IMAGES, type ImageKey } from './manifest';

/**
 * 画像を非同期に読み込む。読み込めなかったものは null のまま（描画側で代替表示する）。
 * 読み込みを待たずにゲームは始められ、届いたものから onLoad で再描画される。
 */
export class ImageStore {
  private images = new Map<ImageKey, HTMLImageElement>();

  constructor(onLoad: () => void) {
    for (const key of Object.keys(IMAGES) as ImageKey[]) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0) {
          this.images.set(key, img);
          onLoad();
        }
      };
      // onerror は何もしない: 代替表示のまま
      img.src = `${import.meta.env.BASE_URL}${IMAGE_DIR}${IMAGES[key].file}`;
    }
  }

  get(key: ImageKey): HTMLImageElement | null {
    return this.images.get(key) ?? null;
  }
}
