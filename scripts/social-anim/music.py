"""Original background music, synthesized from scratch (no samples, no third-party audio)."""
import numpy as np, sys, os
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = int(os.environ.get("REVVIN_SR", "44100"))

def env(n, a=0.005, d=0.2, s=0.0, r=0.05):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    e = e * np.where(t < a, 1, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    tail = int(r * SR)
    if tail and tail < n: e[-tail:] *= np.linspace(1, 0, tail)
    return e

def lp(x, fc):
    b, a = butter(2, fc / (SR / 2)); return lfilter(b, a, x)
def hp(x, fc):
    b, a = butter(2, fc / (SR / 2), "high"); return lfilter(b, a, x)

def note_hz(n): return 440 * 2 ** ((n - 69) / 12)

def kick(n):
    t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t * 35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * 0.9

def clap(n, rng):
    x = rng.standard_normal(n); x = hp(lp(x, 4000), 900)
    return x * env(n, 0.002, 0.08) * 0.35

def shaker(n, rng):
    x = hp(rng.standard_normal(n), 6000)
    return x * env(n, 0.003, 0.03) * 0.12

def epiano(freqs, n):
    t = np.arange(n) / SR; out = np.zeros(n)
    for f in freqs:
        mod = np.sin(2 * np.pi * f * 2 * t) * 1.2 * np.exp(-t * 3)
        out += np.sin(2 * np.pi * f * t + mod)
    return out / len(freqs) * env(n, 0.01, 0.9, 0.35, 0.15) * 0.32

def bass(f, n):
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * t) * 0.6
    return lp(x, 600) * env(n, 0.005, 0.25, 0.5, 0.05) * 0.35

def pluck(f, n):
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 5))
    return lp(x, 3500) * env(n, 0.003, 0.18) * 0.18

def track(seconds, bpm=104, seed=1, key=0, out="music.wav"):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR); mix = np.zeros(n + 4 * SR)
    beat = 60 / bpm; step = beat / 4
    prog = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]]
    roots = [36, 33, 29, 31]
    mel = [72, 74, 76, 79, 76, 74, 72, 74, 76, 72, 69, 72, 74, 71, 67, 71]
    total_steps = int(seconds / step) + 1
    for s in range(total_steps):
        pos = int(s * step * SR)
        bar = (s // 16) % 4; sb = s % 16
        if sb in (0, 8, 10): seg = kick(int(0.4 * SR)); mix[pos:pos + len(seg)] += seg
        if sb in (4, 12): seg = clap(int(0.25 * SR), rng); mix[pos:pos + len(seg)] += seg
        if sb % 2 == 1: seg = shaker(int(0.08 * SR), rng); mix[pos:pos + len(seg)] += seg * (1.3 if sb % 4 == 3 else 1)
        if sb == 0:
            seg = epiano([note_hz(x + key) for x in prog[bar]], int(beat * 4 * SR)); mix[pos:pos + len(seg)] += seg
        if sb in (0, 3, 6, 8, 11, 14):
            seg = bass(note_hz(roots[bar] + key), int(step * 2.5 * SR)); mix[pos:pos + len(seg)] += seg
        if s >= 32 and sb % 2 == 0:
            m = mel[(s // 2) % len(mel)] + key
            if (s // 2) % 4 != 3:
                seg = pluck(note_hz(m), int(step * 2 * SR)); mix[pos:pos + len(seg)] += seg
    mix = mix[:n]
    fi, fo = int(0.25 * SR), int(0.9 * SR)
    mix[:fi] *= np.linspace(0, 1, fi); mix[-fo:] *= np.linspace(1, 0, fo)
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    mix = mix / np.max(np.abs(mix)) * 0.5
    st = np.stack([mix, np.roll(mix, int(0.012 * SR)) * 0.92], axis=1)
    wavfile.write(out, SR, (st * 32767).astype(np.int16))

if __name__ == "__main__":
    track(float(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5])