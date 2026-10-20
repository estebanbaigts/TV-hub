"""Original soundtrack for the trailer, synthesized from scratch (no samples, no copyrighted music).

120 BPM, 21.5 s, cuts every 15 frames at 30 fps = one beat. Writes public/music.wav (48 kHz stereo 16-bit).
    python3 -I scripts/make_music.py
"""
import math, os, random, struct, wave

SR, BPM, DUR = 48000, 120.0, 21.5
BEAT = 60.0 / BPM
N = int(SR * DUR)
L = [0.0] * N
R = [0.0] * N
random.seed(7)

# Scene starts (seconds) — keep in sync with src/Trailer.tsx (frames / 30).
CUTS = [2.5, 6.5, 10.0, 13.5, 14.5, 15.5, 16.5, 19.0]
END_HIT = 19.0


def add(i, v, pan=0.0):
    if 0 <= i < N:
        L[i] += v * (1 - max(0, pan))
        R[i] += v * (1 + min(0, pan))


def kick(t0, amp=0.9):
    for n in range(int(0.35 * SR)):
        t = n / SR
        f = 45 + 110 * math.exp(-t * 28)
        add(int(t0 * SR) + n, amp * math.sin(2 * math.pi * f * t) * math.exp(-t * 9))


def hat(t0, amp=0.12):
    for n in range(int(0.05 * SR)):
        t = n / SR
        add(int(t0 * SR) + n, amp * (random.random() * 2 - 1) * math.exp(-t * 90), pan=0.3)


def clap(t0, amp=0.25):
    for n in range(int(0.18 * SR)):
        t = n / SR
        add(int(t0 * SR) + n, amp * (random.random() * 2 - 1) * math.exp(-t * 22), pan=-0.15)


def tone(t0, dur, freq, amp, attack=0.01, release=0.2, harm=(1.0, 0.35, 0.15), pan=0.0, detune=0.0):
    n0, n1 = int(t0 * SR), int((t0 + dur + release) * SR)
    for n in range(n0, min(n1, N)):
        t = (n - n0) / SR
        env = min(1.0, t / attack) if t < dur else max(0.0, 1 - (t - dur) / release)
        s = sum(h * math.sin(2 * math.pi * freq * (k + 1) * (1 + detune) * t) for k, h in enumerate(harm))
        add(n, amp * env * s, pan)


def whoosh(t_end, length=0.45, amp=0.22):
    # Rising filtered noise leading into a cut.
    n0 = int((t_end - length) * SR)
    y = 0.0
    for n in range(int(length * SR)):
        p = n / (length * SR)
        a = 0.02 + 0.4 * p * p            # one-pole low-pass opening up
        y += a * ((random.random() * 2 - 1) - y)
        add(n0 + n, amp * y * math.sin(math.pi * p) ** 0.7, pan=math.sin(p * 6) * 0.4)


# Hook: two hits on the word slams.
kick(0.0, 1.0); tone(0.0, 0.9, 55, 0.25, release=0.8)
kick(1.17, 1.0); tone(1.17, 1.1, 41.2, 0.25, release=0.9)

# Groove from the reveal to the end hit.
CHORDS = [(110.0, [220.0, 261.6, 329.6]), (87.31, [174.6, 220.0, 261.6]),
          (130.8, [261.6, 329.6, 392.0]), (98.0, [196.0, 246.9, 293.7])]  # Am F C G
t = 2.5
beat = 0
while t < END_HIT - 1e-6:
    kick(t, 0.85)
    if beat % 2 == 1:
        clap(t)
    if t >= 6.5:
        hat(t + BEAT / 2)
    root, chord = CHORDS[(beat // 4) % 4]
    tone(t, BEAT * 0.45, root, 0.16, harm=(1.0, 0.5, 0.2))
    if beat % 4 == 0:
        for k, f in enumerate(chord):
            tone(t, BEAT * 3.6, f, 0.045, attack=0.25, release=0.6, harm=(1.0, 0.2), pan=(k - 1) * 0.5, detune=0.002 * (k - 1))
    # Bright arpeggio on the quick cuts.
    if 13.5 <= t < 16.5:
        for k in range(2):
            tone(t + k * BEAT / 2, BEAT * 0.3, chord[(beat + k) % 3] * 2, 0.05, harm=(1.0, 0.3), pan=0.35 if k else -0.35)
    t += BEAT
    beat += 1

for c in CUTS:
    whoosh(c)

# End: big hit and a long chord tail.
kick(END_HIT, 1.1); clap(END_HIT, 0.35)
for k, f in enumerate([110.0, 164.8, 220.0, 277.2, 329.6]):  # A major, a bright resolution
    tone(END_HIT, 0.3, f, 0.07, attack=0.005, release=2.0, harm=(1.0, 0.25), pan=(k - 2) * 0.3)

# Gentle limiter + fades.
peak = max(max(abs(x) for x in L), max(abs(x) for x in R))
g = 0.89 / peak
out = os.path.join(os.path.dirname(__file__), "..", "public", "music.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    frames = bytearray()
    for n in range(N):
        fade = min(1.0, n / (0.02 * SR), (N - n) / (0.4 * SR))
        a = math.tanh(L[n] * g * 1.1) * fade
        b = math.tanh(R[n] * g * 1.1) * fade
        frames += struct.pack("<hh", int(a * 32000), int(b * 32000))
    w.writeframes(bytes(frames))
print("OK", os.path.relpath(out))
