"""予告編の音（効果音と音楽）をすべて合成して WAV に書き出す。

    python3 promo/audio.py <出力.wav>

きっかけの時刻は promo/timeline.json（映像と同じもの）。素材の音源は使わず、numpy だけで作る。
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
TL = json.loads((Path(__file__).parent / 'timeline.json').read_text())
T = TL['t']
N = int(TL['duration'] * SR)
BEAT = 60 / TL['bpm']
mix = np.zeros((2, N))
rng = np.random.default_rng(8)


def secs(n):
    return np.arange(n) / SR


def add(at, sig, gain=1.0, pan=0.0):
    """at 秒から sig を足す。pan は -1（左）〜 1（右）"""
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    mix[0, i : i + len(sig)] += sig * gain * np.sqrt((1 - pan) / 2) * np.sqrt(2)
    mix[1, i : i + len(sig)] += sig * gain * np.sqrt((1 + pan) / 2) * np.sqrt(2)


def env(n, attack=0.005, decay=1.0):
    t = secs(n)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def band(sig, lo, hi):
    """FFT で帯域だけ残す（短い音向け）"""
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, len(sig))


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def rnd(f, k=0):
    """映像側（trailer.html）と同じフレーム乱数"""
    x = np.sin(f * 127.1 + k * 311.7) * 43758.5453
    return x - np.floor(x)


def flicker(f):
    r = rnd(np.floor(f / 2), 7)
    return np.where(r > 0.93, 0.15, np.where(r > 0.86, 0.55, 1.0))


# ------------------------------------------------------------------ 部品
def boom(dur=1.6, f0=70, f1=32):
    """低いドーン"""
    n = int(dur * SR)
    t = secs(n)
    freq = f1 + (f0 - f1) * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(n, 0.003, dur / 3)
    click = band(noise(0.05), 80, 3000) * env(int(0.05 * SR), 0.0005, 0.012)
    s[: len(click)] += click * 0.6
    return s


def ping(dur=2.5, base=523.0):
    """金属的な響き（ご案内の文字が出るとき）"""
    n = int(dur * SR)
    t = secs(n)
    s = np.zeros(n)
    for ratio, g in [(1, 1), (2.76, 0.5), (5.4, 0.3), (8.93, 0.15)]:
        s += g * np.sin(2 * np.pi * base * ratio * t) * np.exp(-t * (1.2 + ratio * 0.4))
    return s * 0.4


def braam(dur=3.0, root=49.0, bright=30):
    """映画予告の「ブォーン」。倍音の数が時間で増えて減る（フィルターの開閉の代わり）"""
    n = int(dur * SR)
    t = secs(n)
    s = np.zeros(n)
    for detune in (-0.4, 0, 0.5):
        for mult in (1, 1.5, 2):
            f0 = root * mult + detune
            for h in range(1, bright):
                if f0 * h > 9000:
                    break
                open_ = np.clip(1 - h / (bright * (0.25 + 0.75 * np.exp(-t * 1.2))), 0, 1)
                s += np.sin(2 * np.pi * f0 * h * t + h) / h * open_
    s = np.tanh(s * 0.6)
    s *= np.clip(t / 0.02, 0, 1) * np.exp(-t / (dur / 2.2))
    return s / np.max(np.abs(s))


def heartbeat():
    def thump(f, d):
        n = int(d * SR)
        t = secs(n)
        return np.sin(2 * np.pi * (f + 30 * np.exp(-t * 30)) * t) * env(n, 0.002, d / 4)
    s = np.zeros(int(0.6 * SR))
    a = thump(52, 0.25)
    b = thump(46, 0.3)
    s[: len(a)] += a
    o = int(0.2 * SR)
    s[o : o + len(b)] += b * 0.7
    return s


def latch():
    """ガチャ（鍵とドアノブ）"""
    s = np.zeros(int(0.35 * SR))
    for at, g in [(0, 1), (0.09, 0.7), (0.16, 0.5)]:
        c = band(noise(0.04), 1500, 7000) * env(int(0.04 * SR), 0.0005, 0.008)
        tone = np.sin(2 * np.pi * 1900 * secs(len(c))) * env(len(c), 0.0005, 0.01)
        i = int(at * SR)
        s[i : i + len(c)] += (c + tone * 0.5) * g
    return s


def creak(dur=1.4):
    """ドアのきしみ（引っかかりながら鳴るノコギリ波）"""
    n = int(dur * SR)
    t = secs(n)
    f = 170 + 120 * np.sin(t * 2.1) + 25 * np.sin(t * 13)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(ph * h) / h for h in range(1, 18))
    stick = (np.sin(2 * np.pi * np.cumsum(28 + 10 * np.sin(t * 3)) / SR) > 0.2).astype(float)
    s = saw * stick * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.5
    return band(s, 300, 4000) * 0.5


def scream(dur=0.8):
    n = int(dur * SR)
    t = secs(n)
    f = 950 + 500 * (t / dur) + 40 * np.sin(2 * np.pi * 7 * t)
    s = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in (1, 2, 3))
    s += band(noise(dur), 2000, 9000) * 0.8
    return s * env(n, 0.01, dur / 2)


def whoosh(dur=0.35, up=True):
    n = int(dur * SR)
    s = band(noise(dur), 400, 9000)
    t = secs(n)
    shape = (t / dur) ** 2 if up else np.exp(-t / (dur / 4))
    return s * shape * 0.5


def riser(dur):
    n = int(dur * SR)
    t = secs(n)
    k = t / dur
    f = 80 * (2 ** (k * 5))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + band(noise(dur), 1000, 12000) * 0.5 * k
    return s * k ** 2


def kick():
    n = int(0.3 * SR)
    t = secs(n)
    f = 45 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.09)


def snare():
    n = int(0.22 * SR)
    t = secs(n)
    return band(noise(0.22), 1200, 9000) * env(n, 0.001, 0.05) + np.sin(2 * np.pi * 185 * t) * env(n, 0.001, 0.04) * 0.6


def hat():
    n = int(0.05 * SR)
    return band(noise(0.05), 7000, 16000) * env(n, 0.0005, 0.012)


def bass(f, dur):
    n = int(dur * SR)
    t = secs(n)
    s = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 9))
    return np.tanh(s * 0.9) * env(n, 0.003, dur * 0.8)


def scratch():
    """レコードを止めるギュイッ"""
    n = int(0.45 * SR)
    t = secs(n)
    f = 900 * np.exp(-t * 6) + 60
    s = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in range(1, 6))
    return (s * 0.6 + band(noise(0.45), 800, 6000) * 0.4) * env(n, 0.003, 0.15)


def drone(dur, root=41.2):
    n = int(dur * SR)
    t = secs(n)
    s = np.zeros(n)
    for f, g in [(root, 1), (root * 1.5 + 0.3, 0.5), (root * 2.02, 0.4), (root * 2.83, 0.15)]:
        s += g * np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 0.1 * t))
    rumble = band(noise(dur), 20, 140)
    return (s * 0.5 + rumble * 0.8) * np.clip(t / 1.5, 0, 1)


def choir(dur, freqs):
    """「アー」という合唱っぽい和音（ビブラートつきの正弦波を重ねる）"""
    n = int(dur * SR)
    t = secs(n)
    s = np.zeros(n)
    for i, f in enumerate(freqs):
        for d in (-0.6, 0.6):
            vib = 1 + 0.006 * np.sin(2 * np.pi * (5 + i * 0.3) * t + i)
            ph = 2 * np.pi * np.cumsum(f * vib + d) / SR
            s += np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return s / len(freqs) * np.clip(t / 0.15, 0, 1) * np.exp(-t / (dur / 1.5))


# ------------------------------------------------------------------ 第1幕: ホラー
# 蛍光灯のうなり（映像のちらつきと同じタイミングで途切れる）
def hum(t0, t1, fofs=0):
    n = int((t1 - t0) * SR)
    t = secs(n)
    s = 0.5 * np.sin(2 * np.pi * 100 * t) + 0.25 * np.sin(2 * np.pi * 200 * t) + 0.12 * np.sign(np.sin(2 * np.pi * 100 * t))
    frames = np.floor((t0 + t) * TL['fps'])
    gate = flicker(frames + fofs)
    sm = np.convolve(gate, np.ones(200) / 200, mode='same')
    return s * sm


add(T['hall'], hum(T['hall'], T['rules']), 0.05)
add(T['door'], hum(T['door'], T['gacha'], 9), 0.04)
add(T['hall'] + 0.2, drone(T['gacha'] - 0.2), 0.16)
# ご案内: 1行ごとにドーンと金属音
for k in ('rule1', 'rule2', 'rule3', 'rule4'):
    add(T[k], boom(1.8), 0.55)
    add(T[k], ping(2.5, 392 if k != 'rule3' else 370), 0.18, pan=0.3 if k in ('rule2', 'rule4') else -0.3)
add(T['rules'], boom(2.5, 55, 28), 0.5)
# 手がかりの明滅
for i in range(9):
    at = T['clues'] + i * 0.5
    add(at, band(noise(0.18), 300, 8000) * env(int(0.18 * SR), 0.001, 0.05), 0.25, pan=(-1) ** i * 0.4)
    add(at, boom(0.6, 90, 40), 0.3)
add(T['clues'] + 1.0, boom(3.0, 50, 25), 0.6)
add(T['clues'] + 1.0, braam(3.5, 36.7, 12), 0.25)
# ドアに迫る: 心臓の音がだんだん速く
t = T['door']
gap = 0.95
while t < T['gacha'] - 0.3:
    add(t, heartbeat(), 0.7)
    t += gap
    gap = max(0.42, gap * 0.86)
add(T['door'] + 1.4, riser(T['gacha'] - T['door'] - 1.4), 0.3)
# 無音 → ガチャ → ギィィ…
add(T['gacha'], latch(), 0.8)
add(T['open'] + 0.05, creak(T['scare'] - T['open'] - 0.1), 0.35)
add(T['open'] + 0.6, drone(T['scare'] - T['open'] - 0.6, 30.9), 0.25)
# ジャンプスケア
add(T['scare'], braam(3.5, 49.0, 36), 0.9)
add(T['scare'], boom(2.5, 90, 25), 0.9)
add(T['scare'], scream(0.7), 0.25)
add(T['scare'], band(noise(0.4), 100, 12000) * env(int(0.4 * SR), 0.001, 0.08), 0.4)

# ------------------------------------------------------------------ 第2幕: 早回し（150 BPM）
bars_end = T['hush']
roots = [82.41, 65.41, 73.42, 61.74]  # E2, C2, D2, B1
b = 0
t = T['fast']
while t < bars_end - 1e-6:
    beat_in_bar = b % 4
    add(t, kick(), 0.8)
    if beat_in_bar in (1, 3):
        add(t, snare(), 0.45)
    add(t, hat(), 0.15, pan=0.3)
    add(t + BEAT / 2, hat(), 0.1, pan=-0.3)
    root = roots[(b // 4) % 4]
    add(t, bass(root, BEAT / 2 * 0.95), 0.22)
    add(t + BEAT / 2, bass(root * (2 if b % 2 else 1), BEAT / 2 * 0.95), 0.18)
    b += 1
    t = T['fast'] + b * BEAT
# 叩きつける見出し・画面の切り替わりに合わせたシュッ
add(T['fast'], braam(1.4, 82.41, 20), 0.35)
for i in range(3):
    add(T['fast'] + i * BEAT - 0.05, whoosh(0.3, False), 0.5, pan=0.5 - i * 0.5)
for i in range(7):
    add(T['play'] + i * 1.6 - 0.25, whoosh(0.3), 0.45, pan=(-1) ** i * 0.5)
    add(T['play'] + i * 1.6, boom(0.5, 120, 50), 0.35)
for i in range(4):
    add(T['chars'] + i * 1.2 - 0.25, whoosh(0.3), 0.5, pan=(-1) ** i * 0.5)
    add(T['chars'] + i * 1.2, boom(0.6, 110, 45), 0.45)
# 妻の紹介: 笑顔から鬼に変わる瞬間
add(T['chars'] + 1.2 + 0.66, braam(1.2, 61.74, 18), 0.4)
add(T['count'], braam(1.4, 65.41, 20), 0.35)
for i in range(8):
    add(T['ends'] + i * 0.1, band(noise(0.06), 2000, 9000) * env(int(0.06 * SR), 0.001, 0.02), 0.25, pan=(-1) ** i * 0.6)
add(T['ends'] + 0.85, boom(0.8, 120, 40), 0.5)
add(T['ends'] + 0.6, riser(T['hush'] - T['ends'] - 0.6), 0.25)
# 急停止（レコードのギュイッ）
add(T['hush'] - 0.05, scratch(), 0.55)

# ------------------------------------------------------------------ 第3幕: 魔王
add(T['hush'] + 0.3, drone(T['maou'] - T['hush'] - 0.3, 36.7), 0.2)
add(T['hush'] + 0.3, boom(2.0, 60, 30), 0.5)
add(T['words'], boom(2.5, 55, 26), 0.6)
add(T['words'] + 0.7, ping(2.0, 311), 0.2)
for i in range(4):  # チクタク
    add(T['words'] + 0.2 + i * 0.45, band(noise(0.02), 3000, 9000) * env(int(0.02 * SR), 0.0005, 0.004), 0.3, pan=(-1) ** i * 0.3)
# 暴言のチャットがグリッチ
for i in range(10):
    g = band(noise(0.06), 200 + 400 * (i % 3), 6000)
    g = np.round(g * 4) / 4  # ビットを落としたようなザラつき
    add(T['demon'] + i * 0.08, g * env(len(g), 0.001, 0.03), 0.25, pan=(-1) ** i * 0.7)
add(T['demon'] + 0.8, riser(T['maou'] - T['demon'] - 0.8), 0.35)
add(T['demon'] + 0.8, drone(T['maou'] - T['demon'] - 0.8, 27.5), 0.35)
for at in (0.95, 1.35, 1.7, 2.0, 2.25):
    add(T['demon'] + at, boom(0.5, 150, 50), 0.45)
    add(T['demon'] + at, band(noise(0.1), 200, 8000) * env(int(0.1 * SR), 0.001, 0.03), 0.3)
# 「妻が、魔王になる。」
add(T['maou'], braam(3.5, 36.7, 40), 1.0)
add(T['maou'], boom(3.0, 80, 22), 0.9)
add(T['maou'] + 0.05, choir(2.4, [293.7, 349.2, 440.0, 587.3]), 0.12)

# ------------------------------------------------------------------ 締め
add(T['tagline'], drone(T['logo'] - T['tagline'], 41.2), 0.08)
add(T['logo'], braam(3.5, 41.2, 30), 0.85)
add(T['logo'], boom(3.0, 70, 24), 0.8)
add(T['logo'] + 0.02, ping(3.5, 659.3), 0.2)
# おまけ: 暗闇でひと言 → ガチャ（ドアが閉まる）
add(T['stinger'] + 1.3, latch(), 0.8)
add(T['stinger'] + 1.3, boom(0.8, 90, 40), 0.7)

# ------------------------------------------------------------------ 仕上げ
peak = np.max(np.abs(mix))
out = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.89
pcm = (out.T * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'trailer.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', sys.argv[1] if len(sys.argv) > 1 else 'trailer.wav')
