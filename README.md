# Band Tuner

A tuner for band musicians that runs in the browser. Play a note into your phone or laptop mic and it tells you whether you're **flat**, **sharp**, or **in tune**.

## Features
- **Live pitch detection** (YIN algorithm) from tuba range up to piccolo range, accurate to about 1 cent
- **Flat / In tune / Sharp** readout with a cents meter and tips (push the slide in, pull it out)
- **Pick your instrument**: woodwinds, brass and pitched percussion (timpani, marimba, xylophone, glockenspiel, vibraphone, chimes, crotales). Notes are shown as written for that instrument (B♭, E♭, F and octave transpositions), and the tuning tips match it (headjoint, barrel, mouthpiece, slide, timpani pedal…)
- **Tap a pitch to hear it, in your instrument's sound**: a grid of every note in the instrument's range, plus quick tuning notes (concert B♭, F, A, E♭). Sounds are synthesized in the browser, and struck instruments like timpani and mallets keep re-striking while the note is on
- **Tuning standard**: one tap for A = 440, 441, 442 or 443 Hz, or slide anywhere from 430 to 450 Hz
- **How strict**: Strict (±3 cents), Normal (±5) or Relaxed (±10). Your settings are saved.
- Light and dark mode, sized for phones

## Use it
Open `index.html` in a browser. The microphone only works on `https://` or `localhost`, so to use it on a phone, host it somewhere like GitHub Pages (Settings → Pages → deploy from this branch).

For local testing:
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Tests
```
node test/pitch.test.js
node test/instruments.test.js
```
