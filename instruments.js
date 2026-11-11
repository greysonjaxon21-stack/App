// Instrument definitions and sound synthesis for the Band Tuner.
// `transpose` = written pitch minus concert pitch, in semitones (B♭ clarinet = +2, piccolo = -12).
// `range` = [low, high] concert MIDI notes the reference tone offers.
// `sound` describes how the reference tone is synthesized with Web Audio.
(function (root) {
  const BRASS = { flat: 'Too low · push your main tuning slide in', sharp: 'Too high · pull your main tuning slide out' };
  const SAX = { flat: 'Too low · push the mouthpiece further onto the neck', sharp: 'Too high · pull the mouthpiece out a little' };
  const CLAR = { flat: 'Too low · push the barrel in', sharp: 'Too high · pull the barrel out' };
  const FLUTE = { flat: 'Too low · push the headjoint in', sharp: 'Too high · pull the headjoint out' };
  const DOUBLE_REED = { flat: 'Too low · push the reed in further', sharp: 'Too high · pull the reed out a little' };
  const BASSOON = { flat: 'Too low · push the reed further onto the bocal', sharp: 'Too high · pull the reed out / try a longer bocal' };
  const TIMP = { flat: 'Too low · press the pedal down (tighten the head)', sharp: 'Too high · let the pedal up (loosen the head)' };
  const FIXED = { flat: 'This bar/tube sounds low · mallet instruments are fixed pitch', sharp: 'This bar/tube sounds high · mallet instruments are fixed pitch' };
  const PLAIN = { flat: 'Too low · bring your pitch up', sharp: 'Too high · bring your pitch down' };

  // Sustained sounds: `h` = harmonic amplitudes (1st, 2nd, 3rd…), `lp` = low-pass cutoff as a
  // multiple of the fundamental, `vib` = vibrato depth in cents (kept small so the reference stays centered), `breath` = noise level,
  // `brassy` = filter opens over the attack.
  // Struck sounds: `partials` = [ratio to the heard pitch, amplitude, decay seconds],
  // `every` = seconds between re-strikes while the tone plays.
  const INSTRUMENTS = [
    { id: 'concert', name: 'Concert pitch (pure tone)', group: 'General', transpose: 0, range: [48, 84], advice: PLAIN,
      sound: { type: 'sustained', h: [1], attack: 0.03 } },

    // Woodwinds
    { id: 'piccolo', name: 'Piccolo', group: 'Woodwinds', transpose: -12, range: [74, 103], advice: FLUTE,
      sound: { type: 'sustained', h: [1, 0.12, 0.04, 0.01], attack: 0.06, vib: 4, breath: 0.03 } },
    { id: 'flute', name: 'Flute', group: 'Woodwinds', transpose: 0, range: [60, 96], advice: FLUTE,
      sound: { type: 'sustained', h: [1, 0.3, 0.1, 0.05, 0.02], attack: 0.08, vib: 4, breath: 0.05 } },
    { id: 'oboe', name: 'Oboe', group: 'Woodwinds', transpose: 0, range: [58, 91], advice: DOUBLE_REED,
      sound: { type: 'sustained', h: [0.5, 1, 0.9, 0.6, 0.55, 0.45, 0.3, 0.2, 0.15, 0.1], attack: 0.04, vib: 3, lp: 10 } },
    { id: 'bassoon', name: 'Bassoon', group: 'Woodwinds', transpose: 0, range: [34, 75], advice: BASSOON,
      sound: { type: 'sustained', h: [0.6, 1, 0.8, 0.65, 0.45, 0.35, 0.25, 0.15, 0.1], attack: 0.05, vib: 3, lp: 8 } },
    { id: 'ebclarinet', name: 'E♭ Clarinet', group: 'Woodwinds', transpose: -3, range: [55, 91], advice: CLAR,
      sound: { type: 'sustained', h: [1, 0.05, 0.55, 0.04, 0.3, 0.03, 0.15, 0.02, 0.08], attack: 0.04, lp: 9 } },
    { id: 'clarinet', name: 'B♭ Clarinet', group: 'Woodwinds', transpose: 2, range: [50, 89], advice: CLAR,
      sound: { type: 'sustained', h: [1, 0.05, 0.6, 0.04, 0.35, 0.03, 0.2, 0.02, 0.1, 0.01, 0.05], attack: 0.04, lp: 10 } },
    { id: 'altoclarinet', name: 'E♭ Alto Clarinet', group: 'Woodwinds', transpose: 9, range: [43, 79], advice: CLAR,
      sound: { type: 'sustained', h: [1, 0.06, 0.55, 0.05, 0.3, 0.03, 0.15, 0.02, 0.08], attack: 0.05, lp: 8 } },
    { id: 'bassclarinet', name: 'B♭ Bass Clarinet', group: 'Woodwinds', transpose: 14, range: [38, 77], advice: CLAR,
      sound: { type: 'sustained', h: [1, 0.08, 0.6, 0.06, 0.35, 0.04, 0.2, 0.03, 0.1], attack: 0.06, lp: 7 } },
    { id: 'altosax', name: 'Alto Saxophone', group: 'Woodwinds', transpose: 9, range: [49, 81], advice: SAX,
      sound: { type: 'sustained', h: [1, 0.85, 0.65, 0.5, 0.42, 0.35, 0.28, 0.22, 0.16, 0.12, 0.08], attack: 0.04, vib: 3, lp: 12 } },
    { id: 'tenorsax', name: 'Tenor Saxophone', group: 'Woodwinds', transpose: 14, range: [44, 76], advice: SAX,
      sound: { type: 'sustained', h: [1, 0.9, 0.7, 0.55, 0.45, 0.35, 0.28, 0.2, 0.14, 0.1], attack: 0.05, vib: 3, lp: 11 } },
    { id: 'barisax', name: 'Baritone Saxophone', group: 'Woodwinds', transpose: 21, range: [36, 69], advice: SAX,
      sound: { type: 'sustained', h: [1, 0.95, 0.75, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1], attack: 0.05, vib: 3, lp: 10 } },

    // Brass
    { id: 'trumpet', name: 'B♭ Trumpet / Cornet', group: 'Brass', transpose: 2, range: [52, 82], advice: BRASS,
      sound: { type: 'sustained', h: [1, 0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.28, 0.2, 0.15, 0.1], attack: 0.04, lp: 14, brassy: true } },
    { id: 'horn', name: 'French Horn (F)', group: 'Brass', transpose: 7, range: [34, 77], advice: BRASS,
      sound: { type: 'sustained', h: [1, 0.55, 0.35, 0.2, 0.12, 0.07, 0.04], attack: 0.07, lp: 6, brassy: true } },
    { id: 'trombone', name: 'Trombone', group: 'Brass', transpose: 0, range: [40, 72], advice: BRASS,
      sound: { type: 'sustained', h: [1, 0.85, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1], attack: 0.05, lp: 11, brassy: true } },
    { id: 'basstrombone', name: 'Bass Trombone', group: 'Brass', transpose: 0, range: [34, 67], advice: BRASS,
      sound: { type: 'sustained', h: [1, 0.85, 0.7, 0.55, 0.45, 0.35, 0.25, 0.18, 0.12], attack: 0.06, lp: 10, brassy: true } },
    { id: 'euphonium', name: 'Euphonium / Baritone (B.C.)', group: 'Brass', transpose: 0, range: [34, 70], advice: BRASS,
      sound: { type: 'sustained', h: [1, 0.6, 0.38, 0.22, 0.12, 0.06], attack: 0.06, lp: 7, brassy: true } },
    { id: 'baritonetc', name: 'Baritone T.C. (B♭)', group: 'Brass', transpose: 14, range: [34, 70], advice: BRASS,
      sound: { type: 'sustained', h: [1, 0.6, 0.38, 0.22, 0.12, 0.06], attack: 0.06, lp: 7, brassy: true } },
    { id: 'tuba', name: 'Tuba', group: 'Brass', transpose: 0, range: [28, 58], advice: BRASS,
      sound: { type: 'sustained', h: [1, 0.7, 0.42, 0.22, 0.12, 0.06], attack: 0.08, lp: 6, brassy: true } },

    // Pitched percussion
    { id: 'timpani', name: 'Timpani', group: 'Pitched percussion', transpose: 0, range: [38, 60], advice: TIMP,
      sound: { type: 'struck', every: 2.2, thump: 0.5, partials: [[1, 1, 2.6], [1.5, 0.22, 1.2], [2.0, 0.12, 0.9], [2.45, 0.06, 0.7], [2.95, 0.04, 0.5]] } },
    { id: 'marimba', name: 'Marimba', group: 'Pitched percussion', transpose: 0, range: [45, 96], advice: FIXED,
      sound: { type: 'struck', every: 1.3, partials: [[1, 1, 1.4], [3.93, 0.3, 0.25], [9.2, 0.08, 0.08]] } },
    { id: 'xylophone', name: 'Xylophone', group: 'Pitched percussion', transpose: -12, range: [65, 108], advice: FIXED,
      sound: { type: 'struck', every: 0.9, partials: [[1, 1, 0.9], [3, 0.4, 0.25], [6.1, 0.12, 0.1]] } },
    { id: 'glockenspiel', name: 'Glockenspiel / Bells', group: 'Pitched percussion', transpose: -24, range: [79, 108], advice: FIXED,
      sound: { type: 'struck', every: 2.0, partials: [[1, 1, 2.5], [2.76, 0.25, 0.4], [5.4, 0.12, 0.2], [8.93, 0.06, 0.1]] } },
    { id: 'vibraphone', name: 'Vibraphone', group: 'Pitched percussion', transpose: 0, range: [53, 89], advice: FIXED,
      sound: { type: 'struck', every: 2.6, tremolo: 5.5, partials: [[1, 1, 3.2], [4, 0.25, 0.6], [10, 0.06, 0.15]] } },
    { id: 'chimes', name: 'Chimes (Tubular Bells)', group: 'Pitched percussion', transpose: 0, range: [60, 77], advice: FIXED,
      sound: { type: 'struck', every: 3.0, partials: [[1, 1, 4.0], [2.0, 0.35, 2.5], [3.0, 0.2, 1.8], [4.07, 0.1, 1.2]] } },
    { id: 'crotales', name: 'Crotales', group: 'Pitched percussion', transpose: -24, range: [84, 96], advice: FIXED,
      sound: { type: 'struck', every: 2.5, partials: [[1, 1, 3.5], [2.92, 0.2, 1.5], [5.6, 0.08, 0.6]] } },
  ];

  // Common band tuning pitch classes: B♭, F, A, E♭
  const TUNING_PCS = [10, 5, 9, 3];

  // Tuning notes inside an instrument's range, one per pitch class, in the octave nearest mid-range.
  function tuningNotes(inst) {
    const [lo, hi] = inst.range;
    const mid = (lo + hi) / 2;
    const out = [];
    for (const pc of TUNING_PCS) {
      let best = null;
      for (let m = lo; m <= hi; m++) {
        if (m % 12 === pc && (best === null || Math.abs(m - mid) < Math.abs(best - mid))) best = m;
      }
      if (best !== null) out.push(best);
    }
    return out;
  }

  function byId(id) { return INSTRUMENTS.find((i) => i.id === id) || INSTRUMENTS[0]; }

  // ---------- Synthesis ----------
  // Plays an instrument's reference tone until stop() is called.
  // Works with any BaseAudioContext (including OfflineAudioContext for testing).
  function playTone(ctx, dest, inst, freq, volume) {
    volume = volume == null ? 0.3 : volume;
    const s = inst.sound;
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(dest);
    const nodes = [];
    let timer = null;
    const t0 = ctx.currentTime + 0.01;

    if (s.type === 'sustained') {
      const real = new Float32Array(s.h.length + 1);
      s.h.forEach((a, i) => (real[i + 1] = a));
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(ctx.createPeriodicWave(real, new Float32Array(real.length)));
      osc.frequency.value = freq;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(1, t0 + s.attack);

      let chainEnd = osc;
      if (s.lp) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.Q.value = 0.7;
        const cutoff = Math.min(18000, freq * s.lp);
        if (s.brassy) {
          f.frequency.setValueAtTime(freq * 1.5, t0);
          f.frequency.exponentialRampToValueAtTime(cutoff, t0 + 0.12);
        } else f.frequency.value = cutoff;
        osc.connect(f);
        chainEnd = f;
        nodes.push(f);
      }
      chainEnd.connect(env).connect(master);
      nodes.push(osc, env);

      if (s.vib) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = 5.2;
        depth.gain.setValueAtTime(0, t0);
        depth.gain.linearRampToValueAtTime(s.vib, t0 + 0.6); // vibrato fades in, in cents
        lfo.connect(depth).connect(osc.detune);
        lfo.start(t0);
        nodes.push(lfo, depth);
      }
      if (s.breath) {
        const noise = noiseSource(ctx, 2);
        noise.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = Math.min(12000, freq * 2);
        bp.Q.value = 1.5;
        const ng = ctx.createGain();
        ng.gain.value = s.breath;
        noise.connect(bp).connect(ng).connect(env);
        noise.start(t0);
        nodes.push(noise, bp, ng);
      }
      osc.start(t0);
    } else {
      // Struck: schedule a strike now and repeat while playing.
      let outNode = master;
      if (s.tremolo) {
        const trem = ctx.createGain();
        trem.gain.value = 0.75;
        const lfo = ctx.createOscillator();
        const d = ctx.createGain();
        lfo.frequency.value = s.tremolo;
        d.gain.value = 0.25;
        lfo.connect(d).connect(trem.gain);
        lfo.start(t0);
        trem.connect(master);
        outNode = trem;
        nodes.push(trem, lfo, d);
      }
      const ampSum = s.partials.reduce((sum, p) => sum + p[1], 0);
      const strike = (t) => {
        for (const [ratio, rawAmp, decay] of s.partials) {
          const amp = rawAmp / ampSum;
          const pf = freq * ratio;
          if (pf > ctx.sampleRate / 2.2) continue;
          const o = ctx.createOscillator();
          o.frequency.value = pf;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(amp, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
          o.connect(g).connect(outNode);
          o.start(t);
          o.stop(t + decay + 0.05);
        }
        if (s.thump) {
          // Mallet hitting the drum head: short low-passed noise burst
          const n = noiseSource(ctx, 0.15);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 400;
          const g = ctx.createGain();
          g.gain.setValueAtTime(s.thump, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          n.connect(lp).connect(g).connect(outNode);
          n.start(t);
        }
      };
      strike(t0);
      if (typeof ctx.startRendering !== 'function') {
        timer = setInterval(() => strike(ctx.currentTime + 0.02), s.every * 1000);
      } else {
        // Offline rendering: pre-schedule strikes for the render length
        for (let t = t0 + s.every; t < ctx.length / ctx.sampleRate; t += s.every) strike(t);
      }
    }

    return {
      stop() {
        if (timer) clearInterval(timer);
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.08);
        setTimeout(() => {
          nodes.forEach((n) => { try { n.stop && n.stop(); } catch (e) {} });
          try { master.disconnect(); } catch (e) {}
        }, 150);
      },
    };
  }

  function noiseSource(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = b;
    return src;
  }

  const api = { INSTRUMENTS, tuningNotes, byId, playTone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Instruments = api;
})(typeof window !== 'undefined' ? window : globalThis);
