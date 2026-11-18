#!/usr/bin/env python3
"""ROM を snes9x（libretro コア）で画面なしで動かして、ボタン操作を流し込み、スクリーンショットを撮る。

  python3 snes/test_rom.py [ROM] [出力フォルダ]

Debian/Ubuntu なら `apt install libretro-snes9x` でコアが入る。
"""
from __future__ import annotations

import ctypes as C
import sys
from pathlib import Path

from PIL import Image

CORE = '/usr/lib/x86_64-linux-gnu/libretro/snes9x_libretro.so'
ROOT = Path(__file__).resolve().parent

BTN = dict(B=0, Y=1, SELECT=2, START=3, UP=4, DOWN=5, LEFT=6, RIGHT=7, A=8, X=9)


class GameInfo(C.Structure):
    _fields_ = [('path', C.c_char_p), ('data', C.c_void_p), ('size', C.c_size_t), ('meta', C.c_char_p)]


ENV_CB = C.CFUNCTYPE(C.c_bool, C.c_uint, C.c_void_p)
VIDEO_CB = C.CFUNCTYPE(None, C.c_void_p, C.c_uint, C.c_uint, C.c_size_t)
AUDIO_CB = C.CFUNCTYPE(None, C.c_int16, C.c_int16)
AUDIO_BATCH_CB = C.CFUNCTYPE(C.c_size_t, C.c_void_p, C.c_size_t)
POLL_CB = C.CFUNCTYPE(None)
STATE_CB = C.CFUNCTYPE(C.c_int16, C.c_uint, C.c_uint, C.c_uint, C.c_uint)


class Emu:
    def __init__(self, rom: Path):
        self.lib = C.CDLL(CORE)
        self.frame = None
        self.fmt = 0  # 0 = 0RGB1555, 1 = XRGB8888, 2 = RGB565
        self.pressed: set[int] = set()
        self._sysdir = C.c_char_p(b'/tmp')
        self._cbs = [ENV_CB(self._env), VIDEO_CB(self._video), AUDIO_CB(lambda l, r: None),
                     AUDIO_BATCH_CB(lambda d, n: n), POLL_CB(lambda: None), STATE_CB(self._state)]
        L = self.lib
        L.retro_set_environment(self._cbs[0])
        L.retro_set_video_refresh(self._cbs[1])
        L.retro_set_audio_sample(self._cbs[2])
        L.retro_set_audio_sample_batch(self._cbs[3])
        L.retro_set_input_poll(self._cbs[4])
        L.retro_set_input_state(self._cbs[5])
        L.retro_init()
        data = rom.read_bytes()
        self._buf = C.create_string_buffer(data, len(data))
        info = GameInfo(str(rom).encode(), C.cast(self._buf, C.c_void_p), len(data), None)
        L.retro_load_game.restype = C.c_bool
        assert L.retro_load_game(C.byref(info)), 'ROM を読み込めない'

    def _env(self, cmd, data):
        cmd &= 0xFFFF
        if cmd == 10:  # SET_PIXEL_FORMAT
            self.fmt = C.cast(data, C.POINTER(C.c_int)).contents.value
            return True
        if cmd in (9, 31):  # GET_SYSTEM_DIRECTORY / GET_SAVE_DIRECTORY
            C.cast(data, C.POINTER(C.c_char_p))[0] = self._sysdir.value
            return True
        if cmd == 3:  # GET_CAN_DUPE
            C.cast(data, C.POINTER(C.c_bool))[0] = True
            return True
        return False

    def _video(self, data, w, h, pitch):
        if not data:
            return
        raw = C.string_at(data, pitch * h)
        if self.fmt == 2:
            im = Image.frombuffer('RGB', (w, h), raw, 'raw', 'BGR;16', pitch, 1)
        elif self.fmt == 1:
            im = Image.frombuffer('RGBX', (w, h), raw, 'raw', 'BGRX', pitch, 1).convert('RGB')
        else:
            im = Image.frombuffer('RGB', (w, h), raw, 'raw', 'BGR;15', pitch, 1)
        self.frame = im.copy()

    def _state(self, port, device, index, id_):
        return 1 if port == 0 and device == 1 and id_ in self.pressed else 0

    def run(self, frames=1):
        for _ in range(frames):
            self.lib.retro_run()

    def press(self, name: str, hold=3, after=12):
        self.pressed = {BTN[name]}
        self.run(hold)
        self.pressed = set()
        self.run(after)

    def shot(self, path: Path):
        self.frame.save(path)


def play(emu: Emu, out: Path, keys: str, name: str):
    """keys: 空白区切りのボタン列（A, B, UP...）。数字は待ちフレーム数。"""
    for k in keys.split():
        if k.isdigit():
            emu.run(int(k))
        else:
            emu.press(k)
    emu.run(40)
    emu.shot(out / f'{name}.png')


def main():
    rom = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'build' / '8ban-genkan.sfc'
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'build' / 'shots'
    out.mkdir(parents=True, exist_ok=True)
    emu = Emu(rom)
    emu.run(90)
    emu.shot(out / '01_title.png')
    play(emu, out, 'A 60', '02_hero')
    play(emu, out, 'A A A 60', '03_door_menu')
    # 調べる → ドア（指輪の手がかり）
    play(emu, out, 'A A', '04_door_clue')
    play(emu, out, 'A B', '05_back_main')
    # 指輪をしないままドアを開ける → 怒られる
    play(emu, out, 'DOWN DOWN DOWN A', '06_door_confirm')
    play(emu, out, 'A 20', '07_open')
    play(emu, out, 'A 60', '08_angry')
    play(emu, out, 'A A A', '09_gameover')
    play(emu, out, 'A 120', '10_title_again')
    # 2 周目: 財布の指輪をはめて、チャットを見てから帰る → クリア
    play(emu, out, 'A 60 A A A 60', '11_door_again')
    play(emu, out, 'RIGHT A', '12_items')
    play(emu, out, 'RIGHT RIGHT A A A', '13_ring_choice')
    play(emu, out, 'A', '14_ring_on')
    play(emu, out, 'A B', '15_main')
    play(emu, out, 'DOWN DOWN A A A A', '16_chat_menu')
    play(emu, out, 'A', '17_reply')
    play(emu, out, 'A B B', '18_main2')
    play(emu, out, 'LEFT A', '19_confirm')
    play(emu, out, 'A A 60', '20_smile')
    play(emu, out, 'A 60', '21_clear')
    # 3 周目: 指輪をしないまま「愛してるよ」を送り続けて（1 回 11 分）翌 1:00 を過ぎる → 遅すぎる帰宅
    play(emu, out, 'A A 120 A 60 A A A 60', '22_door_third')
    play(emu, out, 'DOWN DOWN A', '23_phone')
    for _ in range(12):
        emu.press('A')                         # チャット
        play(emu, out, 'A A DOWN A A A', '24_after_love')
    play(emu, out, 'B LEFT A A 60', '25_late')
    print('screenshots →', out)


if __name__ == '__main__':
    main()
