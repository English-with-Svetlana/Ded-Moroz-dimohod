# Delivery twinkle

`delivery-twinkle.wav` is an original, deterministic synthesized bell twinkle created for this project. It contains no recordings, samples or third-party material. It may be used, modified and redistributed with the game.

Mono PCM, 16 bit, 22,050 Hz, 0.70 seconds. Three softly staggered sine-based bell tones (C6, E6, G6), rounded 12 ms attacks, decaying quiet upper partials and a smooth final 100 ms fade. Peak sample amplitude is below 0.15; playback uses the existing 0.24 master gain.

Regenerate byte-identically with `python3 tools/generate-delivery-sound.py`.
