# Band Tuner

A tuner for band musicians that runs in the browser. Play a note into your phone or laptop mic and it tells you whether you're **flat**, **sharp**, or **in tune**.

## Features
- **Live pitch detection** (YIN algorithm) from tuba range up to piccolo range, accurate to about 1 cent
- **Flat / In tune / Sharp** readout with a cents meter and tips (push the slide in, pull it out)
- **Instrument key**: shows the note as written for Concert C, B♭ (clarinet, trumpet, tenor sax), E♭ (alto/bari sax) or F (horn) instruments
- **Reference tone**: plays a pitch so you can tune by ear (band tuning notes like concert B♭ and F are listed first)
- Adjustable **A4 reference** (430–450 Hz) and **in-tune range** (±1–20 cents). Your settings are saved.
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
```
