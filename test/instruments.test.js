// Run with: node test/instruments.test.js
const assert = require('assert');
const I = require('../instruments.js');
const P = require('../pitch.js');

let pass = 0;
function test(name, fn) { fn(); pass++; console.log('ok -', name); }

test('every instrument is well formed', () => {
  const ids = new Set();
  for (const i of I.INSTRUMENTS) {
    assert(!ids.has(i.id), 'duplicate id ' + i.id); ids.add(i.id);
    assert(i.range[0] < i.range[1], i.id + ' range');
    assert(i.advice.flat && i.advice.sharp, i.id + ' advice');
    assert(['sustained', 'struck'].includes(i.sound.type), i.id + ' sound type');
    if (i.sound.type === 'struck') assert(i.sound.partials.length && i.sound.every > 0, i.id + ' partials');
    else assert(i.sound.h.length, i.id + ' harmonics');
  }
});
test('every instrument has tuning notes inside its range', () => {
  for (const i of I.INSTRUMENTS) {
    const t = I.tuningNotes(i);
    assert(t.length > 0, i.id);
    t.forEach((m) => assert(m >= i.range[0] && m <= i.range[1], i.id + ' ' + m));
  }
});
test('pitched percussion is included', () => {
  for (const id of ['timpani', 'marimba', 'xylophone', 'glockenspiel', 'vibraphone', 'chimes', 'crotales']) {
    assert.strictEqual(I.byId(id).id, id);
    assert.strictEqual(I.byId(id).group, 'Pitched percussion');
  }
});
const written = (id, concertMidi) => {
  const n = P.noteFromFrequency(P.frequencyFromMidi(concertMidi), 440, I.byId(id).transpose, true);
  return n.name + n.octave;
};
test('transpositions: concert B♭4 is written correctly', () => {
  assert.strictEqual(written('clarinet', 70), 'C5');
  assert.strictEqual(written('trumpet', 70), 'C5');
  assert.strictEqual(written('altosax', 70), 'G5');
  assert.strictEqual(written('tenorsax', 70), 'C6');
  assert.strictEqual(written('barisax', 70), 'G6');
  assert.strictEqual(written('horn', 70), 'F5');
  assert.strictEqual(written('flute', 70), 'B♭4');
  assert.strictEqual(written('piccolo', 82), 'B♭4'); // sounds an octave up
  assert.strictEqual(written('glockenspiel', 94), 'B♭4'); // sounds two octaves up
  assert.strictEqual(written('timpani', 46), 'B♭2');
});
test('unknown id falls back to concert pitch', () => assert.strictEqual(I.byId('kazoo').id, 'concert'));

console.log(`\n${pass} tests passed`);
