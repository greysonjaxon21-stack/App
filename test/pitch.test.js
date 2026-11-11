// Run with: node test/pitch.test.js
const assert = require('assert');
const P = require('../pitch.js');

const SR = 44100;
function tone(freq, { n = 4096, amp = 0.5, harmonics = false } = {}) {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = Math.sin(2 * Math.PI * freq * t);
    if (harmonics) v += 0.6 * Math.sin(2 * Math.PI * 2 * freq * t) + 0.4 * Math.sin(2 * Math.PI * 3 * freq * t);
    b[i] = amp * v / (harmonics ? 2 : 1);
  }
  return b;
}
const centsOff = (a, b) => 1200 * Math.log2(a / b);

let pass = 0;
function test(name, fn) { fn(); pass++; console.log('ok -', name); }

// Accuracy across band ranges (tuba Bb1 ≈ 58 Hz to piccolo-ish 1500 Hz)
for (const f of [58.27, 87.31, 116.54, 233.08, 440, 466.16, 880, 1500]) {
  test(`detects ${f} Hz within 1 cent (pure)`, () => {
    const got = P.detectPitch(tone(f), SR);
    assert(Math.abs(centsOff(got, f)) < 1, `got ${got}`);
  });
  test(`detects ${f} Hz within 1 cent (with harmonics)`, () => {
    const got = P.detectPitch(tone(f, { harmonics: true }), SR);
    assert(Math.abs(centsOff(got, f)) < 1, `got ${got}`);
  });
}

test('silence returns -1', () => assert.strictEqual(P.detectPitch(new Float32Array(4096), SR), -1));
test('noise returns -1 or something not crashing', () => {
  const b = new Float32Array(4096).map(() => Math.random() * 0.5 - 0.25);
  P.detectPitch(b, SR);
});

test('A4 is A4, 0 cents', () => {
  const n = P.noteFromFrequency(440, 440, 0);
  assert.strictEqual(n.name, 'A'); assert.strictEqual(n.octave, 4); assert(Math.abs(n.cents) < 1e-9);
});
test('slightly flat A reads negative cents', () => {
  const n = P.noteFromFrequency(437, 440, 0);
  assert.strictEqual(n.name, 'A'); assert(n.cents < -10 && n.cents > -13);
  assert.strictEqual(P.status(n.cents, 5), 'flat');
});
test('slightly sharp A reads positive cents', () => {
  const n = P.noteFromFrequency(443, 440, 0);
  assert(n.cents > 10); assert.strictEqual(P.status(n.cents, 5), 'sharp');
});
test('within tolerance is in tune', () => assert.strictEqual(P.status(3, 5), 'in-tune'));
test('concert Bb shows as C for Bb instruments', () => {
  const n = P.noteFromFrequency(466.16, 440, 2, true);
  assert.strictEqual(n.name, 'C');
});
test('concert Bb shows as G for Eb instruments', () => {
  const n = P.noteFromFrequency(466.16, 440, 9, true);
  assert.strictEqual(n.name, 'G');
});
test('concert Bb shows as F for F horn', () => {
  const n = P.noteFromFrequency(466.16, 440, 7, true);
  assert.strictEqual(n.name, 'F');
});
test('band spelling: concert A is F♯ for E♭ instruments, B for B♭', () => {
  assert.strictEqual(P.noteFromFrequency(440, 440, 9, true).name, 'F♯');
  assert.strictEqual(P.noteFromFrequency(440, 440, 2, true).name, 'B');
  assert.strictEqual(P.noteFromFrequency(466.16, 440, 0, true).name, 'B♭');
});
test('A=442 reference shifts the target', () => {
  const n = P.noteFromFrequency(442, 442, 0);
  assert.strictEqual(n.name, 'A'); assert(Math.abs(n.cents) < 1e-9);
});

console.log(`\n${pass} tests passed`);
