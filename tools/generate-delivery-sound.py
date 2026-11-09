"""Generate the game's original sample-free delivery twinkle (no dependencies)."""
from pathlib import Path
import math
import struct
import wave

RATE = 22050
DURATION = 0.70
samples = []
for i in range(round(RATE * DURATION)):
    t = i / RATE
    value = 0
    for start, frequency, amplitude, decay in [
        (0, 1046.5023, .095, .14),
        (.06, 1318.5102, .068, .15),
        (.12, 1567.9817, .052, .16),
    ]:
        u = t - start
        if u < 0:
            continue
        envelope = (1 - math.exp(-u / .012)) * math.exp(-u / decay)
        tone = (
            math.sin(2 * math.pi * frequency * u)
            + .18 * math.exp(-u / .075) * math.sin(2 * math.pi * frequency * 2 * u)
            + .06 * math.exp(-u / .05) * math.sin(2 * math.pi * frequency * 3 * u)
        )
        value += amplitude * envelope * tone
    fade = min(1, max(0, (DURATION - t) / .10))
    fade = fade * fade * (3 - 2 * fade)
    samples.append(round(max(-1, min(1, value * fade)) * 32767))

target = Path(__file__).resolve().parent.parent / 'audio' / 'delivery-twinkle.wav'
target.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(target), 'wb') as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(RATE)
    audio.writeframes(struct.pack('<' + 'h' * len(samples), *samples))
