// Pitch detection and note math for the Band Tuner.
// Works in the browser (attaches to window.Pitch) and in Node (module.exports) for testing.
(function (root) {
  const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  // Spelling band players usually see: flats for E♭/A♭/B♭, sharps for C♯/F♯
  const NOTE_NAMES_BAND = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  // YIN pitch detection (de Cheveigné & Kawahara, 2002).
  // Returns frequency in Hz, or -1 if no clear pitch / too quiet.
  function detectPitch(buf, sampleRate, opts) {
    const o = Object.assign({ minFreq: 40, maxFreq: 2000, threshold: 0.12, minRms: 0.01 }, opts);
    const n = buf.length;

    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < o.minRms) return -1;

    const minTau = Math.max(2, Math.floor(sampleRate / o.maxFreq));
    const maxTau = Math.min(Math.floor(n / 2), Math.ceil(sampleRate / o.minFreq));
    const W = n - maxTau;
    if (W <= 0 || maxTau <= minTau) return -1;

    // Difference function
    const d = new Float32Array(maxTau + 1);
    for (let tau = 1; tau <= maxTau; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) {
        const diff = buf[i] - buf[i + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }

    // Cumulative mean normalized difference
    const cmnd = new Float32Array(maxTau + 1);
    cmnd[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      running += d[tau];
      cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
    }

    // Absolute threshold: first dip below threshold, then walk to its local minimum
    let tau = -1;
    for (let t = minTau; t <= maxTau; t++) {
      if (cmnd[t] < o.threshold) {
        while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau === -1) return -1;

    // Parabolic interpolation for sub-sample accuracy
    let betterTau = tau;
    if (tau > 1 && tau < maxTau) {
      const s0 = cmnd[tau - 1], s1 = cmnd[tau], s2 = cmnd[tau + 1];
      const denom = 2 * (2 * s1 - s2 - s0);
      if (denom !== 0) betterTau = tau + (s2 - s0) / denom;
    }
    // Refine over several periods: for high notes one period is only a few samples, so
    // measuring the lag of k periods (k*tau) gives k times finer resolution.
    const k = Math.min(8, Math.floor((maxTau * 0.9) / betterTau));
    if (k >= 2) {
      const center = Math.round(betterTau * k);
      const span = Math.max(2, Math.ceil(k * 0.6));
      let best = -1, bestVal = Infinity;
      for (let t = Math.max(1, center - span); t <= Math.min(maxTau - 1, center + span); t++) {
        if (d[t] < bestVal) { bestVal = d[t]; best = t; }
      }
      if (best > 1 && best < maxTau) {
        const s0 = d[best - 1], s1 = d[best], s2 = d[best + 1];
        const denom = 2 * (2 * s1 - s2 - s0);
        const refined = (denom !== 0 ? best + (s2 - s0) / denom : best) / k;
        // Only accept if it agrees with the single-period estimate (guards against octave slips)
        if (Math.abs(refined - betterTau) < 0.5) betterTau = refined;
      }
    }
    return sampleRate / betterTau;
  }

  // Convert a frequency to the nearest note. `a4` is the reference pitch (usually 440).
  // `transpose` is semitones to add for display (e.g. +2 for Bb instruments).
  function noteFromFrequency(freq, a4, transpose, preferFlats) {
    a4 = a4 || 440;
    transpose = transpose || 0;
    const midiExact = 69 + 12 * Math.log2(freq / a4);
    const midi = Math.round(midiExact);
    const cents = (midiExact - midi) * 100;
    const shown = midi + transpose;
    const names = preferFlats ? NOTE_NAMES_BAND : NOTE_NAMES_SHARP;
    const idx = ((shown % 12) + 12) % 12;
    return {
      midi,
      name: names[idx],
      octave: Math.floor(shown / 12) - 1,
      cents,
      targetFreq: a4 * Math.pow(2, (midi - 69) / 12),
    };
  }

  function frequencyFromMidi(midi, a4) {
    return (a4 || 440) * Math.pow(2, (midi - 69) / 12);
  }

  function status(cents, tolerance) {
    if (Math.abs(cents) <= tolerance) return 'in-tune';
    return cents < 0 ? 'flat' : 'sharp';
  }

  const api = { detectPitch, noteFromFrequency, frequencyFromMidi, status, NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, NOTE_NAMES_BAND };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pitch = api;
})(typeof window !== 'undefined' ? window : globalThis);
