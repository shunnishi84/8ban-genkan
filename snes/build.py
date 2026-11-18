#!/usr/bin/env python3
"""8番玄関 スーパーファミコン版（試作品・異変ひとつ）の ROM を作る。

  python3 snes/build.py        → snes/build/8ban-genkan.sfc

必要なもの: ca65 / ld65（cc65）、Pillow、numpy、IPAゴシック（fonts-ipafont-gothic）。
文章はここで 1 ページずつ画像にしてタイル化し、絵は 256×160 に切り出して 16 色 × 7 パレットに減色する。
流れ（どのページを出して、どのメニューでどこへ飛ぶか）は下の `story()` に書く小さなスクリプトで、
src/main.s のエンジンがそれを読みながら動く。
"""
from __future__ import annotations

import math
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
IMAGES = REPO / 'public' / 'assets' / 'images'
BUILD = ROOT / 'build'
FONT_PATH = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'

# 時刻（前日 0:00 からの分）
START_TIME = 22 * 60 + 55
LIMIT_TIME = 25 * 60  # これを過ぎてからドアを開けると「遅すぎる帰宅」

# 文字の窓: 256×64（BG3 の 20〜27 行目）、12px の文字を 4 行
BOX_W, BOX_H = 256, 64
TEXT_X = 12
LINE_Y = [3, 18, 33, 48]
TEXT_RIGHT = 246
FONT_SIZE = 12

# 2bpp の色番号（BG3 パレット 0）
C_BG, C_MID, C_FG = 1, 2, 3
TEXT_PALETTE = [(0, 0, 0), (16, 20, 44), (120, 128, 156), (248, 248, 248)]
OBJ_PALETTE = [(0, 0, 0), (255, 214, 40), (60, 40, 0), (255, 255, 255)]

IMG_W, IMG_H = 256, 160
N_PAL = 7  # BG1 で使うパレット（1〜7 番）


def font(size=FONT_SIZE):
    return ImageFont.truetype(FONT_PATH, size)


# ------------------------------------------------------------------ タイル化
def tiles_2bpp(idx: np.ndarray) -> bytes:
    """色番号の配列（高さ・幅は 8 の倍数）→ 行優先に並べた 2bpp タイル。"""
    h, w = idx.shape
    out = bytearray()
    for ty in range(h // 8):
        for tx in range(w // 8):
            t = idx[ty * 8:(ty + 1) * 8, tx * 8:(tx + 1) * 8]
            for row in t:
                p0 = p1 = 0
                for x, v in enumerate(row):
                    bit = 7 - x
                    p0 |= (int(v) & 1) << bit
                    p1 |= ((int(v) >> 1) & 1) << bit
                out += bytes((p0, p1))
    return bytes(out)


def tile_4bpp(t: np.ndarray) -> bytes:
    lo = bytearray()
    hi = bytearray()
    for row in t:
        p = [0, 0, 0, 0]
        for x, v in enumerate(row):
            for b in range(4):
                p[b] |= ((int(v) >> b) & 1) << (7 - x)
        lo += bytes((p[0], p[1]))
        hi += bytes((p[2], p[3]))
    return bytes(lo + hi)


def bgr555(rgb) -> int:
    r, g, b = (int(round(c)) for c in rgb)
    return (r >> 3) | ((g >> 3) << 5) | ((b >> 3) << 10)


def palette_bytes(colors) -> bytes:
    out = bytearray()
    for c in colors:
        v = bgr555(c)
        out += bytes((v & 0xFF, v >> 8))
    return bytes(out)


# ------------------------------------------------------------------ 文字
NO_HEAD = set('、。，．・：；？！ー…‥」』）〕］｝〉》ぁぃぅぇぉっゃゅょァィゥェォッャュョ!?),.')


def wrap(text: str, f, width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split('\n'):
        cur = ''
        for ch in para:
            if f.getlength(cur + ch) > width and cur:
                if ch in NO_HEAD:
                    # 行頭禁則: 句読点などは前の行にぶら下げる
                    cur += ch
                    lines.append(cur)
                    cur = ''
                    continue
                lines.append(cur)
                cur = ch
            else:
                cur += ch
        lines.append(cur)
    return lines


def to_shades(gray: Image.Image) -> np.ndarray:
    """アンチエイリアスつきの灰色画像 → 色番号 1〜3。"""
    a = np.asarray(gray, dtype=np.int32)
    out = np.full(a.shape, C_BG, dtype=np.uint8)
    out[a >= 70] = C_MID
    out[a >= 150] = C_FG
    return out


def render_box(lines: list[str], indent: list[int] | None = None) -> np.ndarray:
    f = font()
    img = Image.new('L', (BOX_W, BOX_H), 0)
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines[:4]):
        x = TEXT_X + (indent[i] if indent else 0)
        d.text((x, LINE_Y[i]), line, font=f, fill=255)
    idx = to_shades(img)
    # 枠: 上下に細い線
    idx[0, :] = C_MID
    idx[1, :] = C_FG
    idx[BOX_H - 1, :] = C_MID
    return idx


# ------------------------------------------------------------------ 絵（16 色 × 7 パレット）
def kmeans(x: np.ndarray, k: int, iters: int = 12, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    uniq = np.unique(x, axis=0)
    if len(uniq) <= k:
        c = np.zeros((k, x.shape[1]))
        c[:len(uniq)] = uniq
        c[len(uniq):] = uniq[0]
        return c
    # k-means++ の初期値
    c = [x[rng.integers(len(x))]]
    for _ in range(1, k):
        d = np.min(((x[:, None, :] - np.array(c)[None]) ** 2).sum(-1), axis=1)
        p = d / d.sum() if d.sum() > 0 else None
        c.append(x[rng.choice(len(x), p=p)])
    c = np.array(c, dtype=np.float64)
    for _ in range(iters):
        lab = np.argmin(((x[:, None, :] - c[None]) ** 2).sum(-1), axis=1)
        for j in range(k):
            m = x[lab == j]
            if len(m):
                c[j] = m.mean(0)
    return c


def snap5(c: np.ndarray) -> np.ndarray:
    return np.clip(np.round(c / 8.0) * 8.0, 0, 248)


def convert_image(img: Image.Image):
    """256×160 の RGB 画像 → (4bpp タイル列, 32×32 の地図, 7×16 色のパレット)。"""
    a = np.asarray(img.convert('RGB'), dtype=np.float64)
    a = snap5(a)
    th, tw = IMG_H // 8, IMG_W // 8
    tiles = a.reshape(th, 8, tw, 8, 3).transpose(0, 2, 1, 3, 4).reshape(th * tw, 64, 3)
    # タイルを色の傾向で 7 グループに分け、グループごとに 15 色を選ぶ。何回か割り当てをやり直す
    feat = np.concatenate([tiles.mean(1), tiles.std(1)], axis=1)
    groups = np.argmin(((feat[:, None] - kmeans(feat, N_PAL)[None]) ** 2).sum(-1), axis=1)
    pals = np.zeros((N_PAL, 15, 3))
    for it in range(4):
        for g in range(N_PAL):
            px = tiles[groups == g].reshape(-1, 3)
            if len(px) == 0:
                px = tiles.reshape(-1, 3)[::37]
            if len(px) > 6000:
                px = px[np.random.default_rng(it).choice(len(px), 6000, replace=False)]
            pals[g] = snap5(kmeans(px, 15, seed=it))
        # 各タイルを、誤差が一番小さいパレットに割り当て直す
        err = np.zeros((len(tiles), N_PAL))
        for g in range(N_PAL):
            d = ((tiles[:, :, None, :] - pals[g][None, None]) ** 2).sum(-1).min(-1)
            err[:, g] = d.sum(1)
        groups = err.argmin(1)
    # タイルを作る（0 番は全部透明 = 黒の背景）
    blobs: list[bytes] = [bytes(32)]
    seen: dict[bytes, int] = {bytes(32): 0}
    tmap = np.zeros((32, 32), dtype=np.int32)
    for i, t in enumerate(tiles):
        g = groups[i]
        idx = ((t[:, None, :] - pals[g][None]) ** 2).sum(-1).argmin(-1) + 1
        b = tile_4bpp(idx.reshape(8, 8))
        if b not in seen:
            seen[b] = len(blobs)
            blobs.append(b)
        tmap[i // tw, i % tw] = seen[b] | ((g + 1) << 10)
    pal_colors = []
    for g in range(N_PAL):
        pal_colors += [(0, 0, 0)] + [tuple(c) for c in pals[g]]
    map_bytes = b''.join(int(v).to_bytes(2, 'little') for v in tmap.flatten())
    return b''.join(blobs), map_bytes, palette_bytes(pal_colors)


def crop(name: str, width: int, y: int, x: int | None = None, bright: float = 1.0) -> Image.Image:
    """元絵を幅 width に縮めてから、(x, y) を左上に 256×160 を切り出す。x 省略で左右中央。"""
    src = Image.open(IMAGES / f'{name}.webp').convert('RGB')
    h = round(src.height * width / src.width)
    im = src.resize((width, h), Image.LANCZOS)
    if x is None:
        x = (width - IMG_W) // 2
    im = im.crop((x, y, x + IMG_W, y + IMG_H))
    if bright != 1.0:
        im = ImageEnhance.Brightness(im).enhance(bright)
    return im


def title_image() -> Image.Image:
    im = crop('bg_door', 256, 70, bright=0.45)
    d = ImageDraw.Draw(im)
    # 黄色い案内板ふうのロゴ
    d.rounded_rectangle((40, 40, 216, 104), radius=6, fill=(250, 204, 21), outline=(20, 20, 20), width=3)
    f = ImageFont.truetype(FONT_PATH, 34)
    w = f.getlength('8番玄関')
    d.text(((256 - w) / 2, 52), '8番玄関', font=f, fill=(20, 20, 20))
    f2 = ImageFont.truetype(FONT_PATH, 12)
    sub = 'スーパーファミコン版 試作品'
    d.text(((256 - f2.getlength(sub)) / 2, 116), sub, font=f2, fill=(240, 240, 240))
    return im


def hero_image() -> Image.Image:
    """主人公の立ち絵（背景が透明）を、暗くした廊下の上に重ねる。"""
    bg = crop('bg_door', 256, 40, bright=0.35)
    src = Image.open(IMAGES / 'hero.webp').convert('RGBA')
    h = IMG_H + 10
    fg = src.resize((round(src.width * h / src.height), h), Image.LANCZOS)
    a = np.asarray(fg).copy()
    a[..., 3] = np.where(a[..., 3] < 128, 0, 255)  # 縁のにじみを切る
    fg = Image.fromarray(a)
    bg.paste(fg, ((IMG_W - fg.width) // 2, 4), fg)
    return bg


IMAGE_DEFS = {
    'title': title_image,
    'hero': hero_image,
    'door': lambda: crop('bg_door', 300, 90),
    'wife_angry': lambda: crop('wife_angry', 256, 18),
    'wife_smile': lambda: crop('wife_smile', 256, 62),
    'wife_dark': lambda: crop('wife_dark', 256, 62),
    'clear': lambda: crop('clear', 256, 150),
}


# ------------------------------------------------------------------ スクリプト
OP = dict(RESET=0, PAGE=1, MENU=2, JUMP=3, SET=4, IF=5, ADDTIME=6, IMAGE=7, IFLATE=8, HUD=9, SHAKE=10, FADE=11)
FLAGS = {'ring_on': 0}


@dataclass
class Script:
    code: bytearray = field(default_factory=bytearray)
    labels: dict[str, int] = field(default_factory=dict)
    fixups: list[tuple[int, str]] = field(default_factory=list)
    pages: list[bytes] = field(default_factory=list)
    page_ids: dict[bytes, int] = field(default_factory=dict)
    images: list[str] = field(default_factory=list)

    def label(self, name: str):
        assert name not in self.labels, name
        self.labels[name] = len(self.code)

    def _op(self, name: str, *args: int):
        self.code.append(OP[name])
        self.code += bytes(args)

    def _target(self, label: str):
        self.fixups.append((len(self.code), label))
        self.code += b'\0\0'

    def _page_id(self, idx: np.ndarray) -> int:
        b = tiles_2bpp(idx)
        assert len(b) == 4096
        if b not in self.page_ids:
            self.page_ids[b] = len(self.pages)
            self.pages.append(b)
        return self.page_ids[b]

    def say(self, text: str):
        """文章を出して A ボタンを待つ。4 行を超えたら自動でページを分ける。"""
        lines = wrap(text, font(), TEXT_RIGHT - TEXT_X)
        for i in range(0, len(lines), 4):
            pid = self._page_id(render_box(lines[i:i + 4]))
            self._op('PAGE')
            self.code += pid.to_bytes(2, 'little')

    def menu(self, prompt: str, options: list[tuple[str, str]], cancel: int | None = None, cols: int | None = None):
        """prompt と選択肢（ラベル, 飛び先）。選択肢は prompt の下の 3 行に並べる。"""
        n = len(options)
        f = font()
        plines = wrap(prompt, f, TEXT_RIGHT - TEXT_X) if prompt else []
        rows_free = 4 - len(plines)
        if cols is None:
            cols = math.ceil(n / rows_free)
        rows = math.ceil(n / cols)
        assert rows <= rows_free, (prompt, options)
        col_w = (TEXT_RIGHT - TEXT_X) // cols
        img = Image.new('L', (BOX_W, BOX_H), 0)
        d = ImageDraw.Draw(img)
        for i, line in enumerate(plines):
            d.text((TEXT_X, LINE_Y[i]), line, font=f, fill=255)
        pos = []
        for i, (label, _) in enumerate(options):
            r, c = divmod(i, cols)
            x = TEXT_X + 12 + c * col_w
            y = LINE_Y[len(plines) + r]
            assert f.getlength(label) <= col_w - 14 or cols == 1, label
            d.text((x, y), label, font=f, fill=255)
            pos.append((x - 11, 160 + y + 2))
        idx = to_shades(img)
        idx[0, :] = C_MID
        idx[1, :] = C_FG
        idx[BOX_H - 1, :] = C_MID
        pid = self._page_id(idx)
        self._op('MENU')
        self.code += pid.to_bytes(2, 'little')
        self.code += bytes((n, 0xFF if cancel is None else cancel))
        for (x, y), (_, target) in zip(pos, options):
            self.code += bytes((x, y))
            self._target(target)

    def jump(self, label: str):
        self._op('JUMP')
        self._target(label)

    def set(self, flag: str):
        self._op('SET', FLAGS[flag])

    def if_(self, flag: str, label: str):
        self._op('IF', FLAGS[flag])
        self._target(label)

    def iflate(self, label: str):
        self._op('IFLATE')
        self._target(label)

    def time(self, minutes: int):
        self._op('ADDTIME', minutes)

    def image(self, name: str):
        if name not in self.images:
            self.images.append(name)
        self._op('IMAGE', self.images.index(name))

    def hud(self, on: bool):
        self._op('HUD', 1 if on else 0)

    def shake(self, frames: int):
        self._op('SHAKE', frames)

    def fade(self):
        self._op('FADE')

    def reset(self):
        self._op('RESET')

    def resolve(self) -> bytes:
        for pos, label in self.fixups:
            addr = 0x8000 + self.labels[label]
            self.code[pos:pos + 2] = addr.to_bytes(2, 'little')
        assert len(self.code) < 0x4000
        return bytes(self.code)


WIFE = '妻'


def story(s: Script):
    """試作品の中身: 1日目、異変は「結婚指輪を外したまま」ひとつ。"""
    s.label('title')
    s.reset()
    s.hud(False)
    s.image('title')
    s.say('Ａボタンで はじめる\n\n（試作品：異変ひとつ・1日目だけ）')
    s.image('hero')
    s.say('1日目\n今日も飲み会だった……。\n自宅の玄関前に着いた。')
    s.say('妻を怒らせる「異変」があったら、ドアを開ける前に片付けておかないといけない。')
    s.say('調べたりスマホを見たりすると、時間が進む。\n翌1:00を過ぎたら、もう手遅れだ。')
    s.image('door')
    s.hud(True)

    # ------------------------------------------------ 玄関前
    s.label('main')
    s.menu('どうする？', [('調べる', 'look'), ('持ち物', 'items'), ('スマホ', 'phone'), ('ドアを開ける', 'door')], cols=2)

    s.label('look')
    s.menu('どこを調べる？', [('ドア', 'look_door'), ('窓', 'look_window'), ('表札', 'look_name'),
                           ('足元', 'look_floor'), ('廊下', 'look_hall'), ('戻る', 'main')], cancel=5, cols=3)
    s.label('look_door')
    s.time(1)
    s.if_('ring_on', 'look_door_ok')
    s.say('ドアノブに手をかけた左手……\n薬指が妙に軽い。')
    s.jump('look')
    s.label('look_door_ok')
    s.say('見慣れた自宅のドア。傘立てには妻の花柄の傘と、自分の黒い傘。')
    s.jump('look')
    for key, text in [
        ('window', '廊下側の小窓。リビングの灯りがうっすら漏れている。いつも通りだ。'),
        ('name', '表札『田中』。いつも通り。'),
        ('floor', '玄関マットは乾いている。足元に変わったところはない。'),
        ('hall', 'マンションの共用廊下。蛍光灯が少しチカチカしている。いつも通りだ。'),
    ]:
        s.label(f'look_{key}')
        s.time(1)
        s.say(text)
        s.jump('look')

    # ------------------------------------------------ 持ち物
    s.label('items')
    s.menu('持ち物を確かめる', [('鞄', 'item_bag'), ('ワイシャツ', 'item_shirt'), ('財布', 'item_wallet'),
                           ('名刺入れ', 'item_card'), ('戻る', 'main')], cancel=4, cols=2)
    for key, text in [
        ('bag', '鞄の中には書類とノートPC。'),
        ('shirt', '少しよれたワイシャツ。特に変わったところはない。'),
        ('card', '名刺入れ。自分の名刺だけが入っている。'),
    ]:
        s.label(f'item_{key}')
        s.time(1)
        s.say(text)
        s.jump('items')
    s.label('item_wallet')
    s.time(1)
    s.if_('ring_on', 'item_wallet_ok')
    s.say('財布。カードと小銭が少し。\n……小銭入れの中で、何かがキラリと光る。')
    s.say('【結婚指輪】\n飲み会でなぜか外したらしい。')
    s.menu('結婚指輪をどうする？', [('指にはめる', 'ring_wear'), ('そのまま', 'items')], cancel=1, cols=1)
    s.label('ring_wear')
    s.time(2)
    s.set('ring_on')
    s.say('左手の薬指に指輪をはめ直した。\nしっくりくる。')
    s.jump('items')
    s.label('item_wallet_ok')
    s.say('財布。カードと小銭が少し。')
    s.jump('items')

    # ------------------------------------------------ スマホ
    s.label('phone')
    s.menu('スマホ', [('チャット', 'chat'), ('カレンダー', 'calendar'), ('メモ', 'memo'), ('戻る', 'main')], cancel=3, cols=2)
    s.label('calendar')
    s.time(1)
    s.say('カレンダー\n今日：予定なし')
    s.jump('phone')
    s.label('memo')
    s.time(1)
    s.say('メモ\nメモはありません。')
    s.jump('phone')
    s.label('chat')
    s.time(1)
    s.say('妻とのチャット\n妻：（昨日）洗濯物取り込んどいたよ〜\n自分：（昨日）ありがと！')
    s.say('妻：最近、飲み会の日って指輪してないよね？（昨日）')
    s.label('chat_send')
    s.menu('メッセージを送る？', [('今から帰るね', 'send_home'), ('いつもありがとう。愛してるよ', 'send_love'),
                             ('送らない', 'phone')], cancel=2, cols=1)
    s.label('send_home')
    s.time(2)
    s.if_('ring_on', 'send_home_ok')
    s.say('自分：今から帰るね\n妻：はーい。……指輪、してる？')
    s.jump('phone')
    s.label('send_home_ok')
    s.say('自分：今から帰るね\n妻：はーい。気をつけてね')
    s.jump('phone')
    s.label('send_love')
    s.time(2)
    s.if_('ring_on', 'send_love_ok')
    s.say('自分：いつもありがとう。愛してるよ\n妻：……左手の薬指、見てから言って。')
    s.time(8)
    s.say('……電話がかかってきた。\n8分間、みっちり問い詰められた。')
    s.jump('phone')
    s.label('send_love_ok')
    s.say('自分：いつもありがとう。愛してるよ\n妻：急にどうしたの？ ……早く帰っておいで。')
    s.jump('phone')

    # ------------------------------------------------ ドア
    s.label('door')
    s.menu('ドアを開ける？（もう戻れない）', [('開ける', 'open'), ('やめる', 'main')], cancel=1, cols=2)
    s.label('open')
    s.iflate('late')
    s.if_('ring_on', 'success')
    s.say('ガチャ……')
    s.image('wife_angry')
    s.shake(40)
    s.say(f'{WIFE}「……指輪は？」')
    s.say(f'{WIFE}「外して飲んでたの？ なんで？ ねえ、なんで？」')
    s.shake(30)
    s.say(f'{WIFE}「明日から指輪、瞬間接着剤でつけてあげるね。」')
    s.say('ＧＡＭＥ ＯＶＥＲ\n理由：妻の怒り\n火種：結婚指輪を外したまま')
    s.fade()
    s.jump('title')

    s.label('late')
    s.image('wife_dark')
    s.say('時計の針は、翌1:00を回っていた。')
    s.say(f'{WIFE}「……今、何時だと思ってるの？」')
    s.say(f'{WIFE}「午前1時、過ぎてるんだけど。」')
    s.say(f'{WIFE}「言い訳は、朝ごはんの時に聞きます。」')
    s.say('ＧＡＭＥ ＯＶＥＲ\n理由：遅すぎる帰宅')
    s.fade()
    s.jump('title')

    s.label('success')
    s.say('ガチャ……')
    s.image('wife_smile')
    s.say(f'{WIFE}「（左手をチラッと見て）\n……よし。おかえり。」')
    s.image('clear')
    s.say('1日目 クリア！\n怒りの火種を見つけて、ちゃんと消せた。')
    s.say('試作品はここまで。\n遊んでくれて、ありがとうございやした！')
    s.fade()
    s.jump('title')


# ------------------------------------------------------------------ 固定の素材
def hud_tiles() -> bytes:
    """上の帯（256×16、タイル 256〜319）+ 時計の数字（8×16 を上下 2 枚、0〜9 と「:」）。"""
    f = font()
    img = Image.new('L', (256, 16), 0)
    d = ImageDraw.Draw(img)
    d.text((8, 2), '1日目', font=f, fill=255)
    d.text((150, 2), '制限 1:00', font=f, fill=150)
    band = to_shades(img)
    band[15, :] = C_MID
    out = tiles_2bpp(band)
    glyphs = '0123456789:'
    tops, bots = [], []
    for ch in glyphs:
        g = Image.new('L', (8, 16), 0)
        gd = ImageDraw.Draw(g)
        w = f.getlength(ch)
        gd.text(((8 - w) / 2, 2), ch, font=f, fill=255)
        a = to_shades(g)
        a[15, :] = C_MID
        tops.append(tiles_2bpp(a[:8]))
        bots.append(tiles_2bpp(a[8:]))
    return out + b''.join(tops) + b''.join(bots)


def obj_tiles() -> bytes:
    arrow = [
        '22000000',
        '21200000',
        '21120000',
        '21112000',
        '21120000',
        '21200000',
        '22000000',
        '00000000',
    ]
    down = [
        '22222220',
        '21111120',
        '02111200',
        '02111200',
        '00212000',
        '00212000',
        '00020000',
        '00000000',
    ]
    return b''.join(tile_4bpp(np.array([[int(c) for c in row] for row in t])) for t in (arrow, down))


# ------------------------------------------------------------------ 組み立て
def main():
    BUILD.mkdir(exist_ok=True)
    s = Script()
    story(s)
    script = s.resolve()

    blobs: list[tuple[str, bytes]] = []  # (ラベル, 中身) — バンクをまたがないように詰める
    for i, p in enumerate(s.pages):
        blobs.append((f'page_{i}', p))
    image_rows = []
    for i, name in enumerate(s.images):
        im = IMAGE_DEFS[name]()
        im.save(BUILD / f'img_{name}.png')
        t, m, p = convert_image(im)
        blobs += [(f'img{i}_t', t), (f'img{i}_m', m), (f'img{i}_p', p)]
        image_rows.append((i, len(t)))
        print(f'  image {name}: {len(t) // 32} tiles')

    misc = [('script', script), ('hud_tiles', hud_tiles()), ('obj_tiles', obj_tiles()),
            ('text_palette', palette_bytes(TEXT_PALETTE)), ('obj_palette', palette_bytes(OBJ_PALETTE))]
    banks: list[list[tuple[str, bytes]]] = [misc]
    for label, data in sorted(blobs, key=lambda b: -len(b[1])):
        for bank in banks:
            if sum(len(d) for _, d in bank) + len(data) <= 0x8000:
                bank.append((label, data))
                break
        else:
            banks.append([(label, data)])
    n_banks = 1 + len(banks)  # バンク 0 = エンジン
    rom_banks = 8
    while rom_banks < n_banks:
        rom_banks *= 2
    rom_kb = rom_banks * 32
    rom_code = int(math.log2(rom_kb))

    # データを .incbin で読む gen.s
    lines = []
    for bi, bank in enumerate(banks, start=1):
        lines.append(f'.segment "BANK{bi}"')
        for label, data in bank:
            fn = BUILD / f'{label}.bin'
            fn.write_bytes(data)
            lines.append(f'{label}:')
            lines.append(f'  .incbin "{fn.name}"')
    lines.append('.segment "RODATA"')
    lines.append('page_tbl:')
    for i in range(len(s.pages)):
        lines.append(f'  .faraddr page_{i}')
    lines.append('image_tbl:')
    for i, size in image_rows:
        lines.append(f'  .faraddr img{i}_t')
        lines.append(f'  .word {size}')
        lines.append(f'  .faraddr img{i}_m')
        lines.append(f'  .faraddr img{i}_p')
        lines.append('  .byte 0')
    (BUILD / 'gen.s').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    (BUILD / 'gen.inc').write_text('\n'.join([
        f'START_TIME = {START_TIME}',
        f'LIMIT_TIME = {LIMIT_TIME}',
        'DIGIT_TOP = 64',
        'DIGIT_BOT = 75',
        f'HUD_TILES_SIZE = {len(hud_tiles())}',
        f'ROM_SIZE_CODE = ${rom_code:02X}',
    ]) + '\n', encoding='utf-8')

    cfg = ['MEMORY {',
           '  ZP: start = $0000, size = $0100, type = rw;',
           '  RAM: start = $0200, size = $1C00, type = rw;']
    for b in range(rom_banks):
        cfg.append(f'  ROM{b}: start = ${b:02X}8000, size = $8000, type = ro, fill = yes, fillval = $00, file = %O;')
    cfg += ['}', 'SEGMENTS {',
            '  ZEROPAGE: load = ZP, type = zp;',
            '  BSS: load = RAM, type = bss, optional = yes;',
            '  CODE: load = ROM0, type = ro;',
            '  RODATA: load = ROM0, type = ro;',
            '  HEADER: load = ROM0, type = ro, start = $FFC0;',
            '  VECTORS: load = ROM0, type = ro, start = $FFE0;']
    for bi in range(1, len(banks) + 1):
        cfg.append(f'  BANK{bi}: load = ROM{bi}, type = ro;')
    cfg.append('}')
    (BUILD / 'snes.cfg').write_text('\n'.join(cfg) + '\n')

    out = BUILD / '8ban-genkan.sfc'
    run(['ca65', '--cpu', '65816', '-I', str(BUILD), '--bin-include-dir', str(BUILD),
         '-o', str(BUILD / 'main.o'), str(ROOT / 'src' / 'main.s')])
    run(['ld65', '-C', str(BUILD / 'snes.cfg'), '-o', str(out), '-m', str(BUILD / 'map.txt'), str(BUILD / 'main.o')])

    # ヘッダーのチェックサム
    rom = bytearray(out.read_bytes())
    assert len(rom) == rom_kb * 1024, len(rom)
    rom[0x7FDC:0x7FE0] = b'\xff\xff\x00\x00'
    total = sum(rom) & 0xFFFF
    rom[0x7FDC:0x7FDE] = (total ^ 0xFFFF).to_bytes(2, 'little')
    rom[0x7FDE:0x7FE0] = total.to_bytes(2, 'little')
    out.write_bytes(rom)
    print(f'{out.relative_to(REPO)}: {rom_kb}KB, script {len(script)} bytes, '
          f'{len(s.pages)} pages, {len(s.images)} images, {len(banks) + 1} banks used')


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        sys.exit(r.returncode)
    if r.stderr.strip():
        sys.stderr.write(r.stderr)


if __name__ == '__main__':
    main()
