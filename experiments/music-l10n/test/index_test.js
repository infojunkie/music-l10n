import { deepEqual } from 'assert';
import _ from 'lodash';

import '../lib';
import { /*Interval, */Scale, Chord } from '../lib/chords.js';
import { EDO, Tuning } from '../lib/tuning.js';
import { ToneRow } from '../lib/tonerow.js';

describe('Tuning', () => {
  const concertTuning = new Tuning(EDO(12), 440);

  it('generates correct normalized pitch vectors for equal temperament tunings', () => {
    // @see https://en.wikipedia.org/wiki/Equal_temperament#Comparison_to_just_intonation
    deepEqual(_.range(13).map( (d) => { return concertTuning.getNormalizedPitch(d, 6); }),
    [
      1, 1.059463, 1.122462, 1.189207, 1.259921, 1.334840, 1.414214, 1.498307, 1.587401, 1.681793, 1.781797, 1.887749, 2
    ]);
  });

  it('generates correct frequencies from pitch vectors', () => {
    // https://en.wikipedia.org/wiki/Piano_key_frequencies
    deepEqual(_.range(13).map( (d) => { return concertTuning.getPitchFrequency(d, 3); }),
    [
      440, 466.164, 493.883, 523.251, 554.365, 587.330, 622.254, 659.255, 698.456, 739.989, 783.991, 830.609, 880
    ]);
  });
});

describe('ToneRow', () => {
  // @see https://en.wikipedia.org/wiki/Concerto_for_Nine_Instruments_(Webern)
  const t1 = new ToneRow([0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10]);

  it('computes the correct tonerow transpositions', () => {
    deepEqual(t1.transpose(1), [
      1, 0, 4, 5, 9, 8, 10, 6, 7, 2, 3, 11
    ]);
    deepEqual(t1.transpose(-2), [
      10, 9, 1, 2, 6, 5, 7, 3, 4, 11, 0, 8
    ]);
    deepEqual(t1.transpose(12), [
      0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10
    ]);
  });

  it('computes the correct tonerow inversions', () => {
    deepEqual(t1.invert(1), [
      1, 2, 10, 9, 5, 6, 4, 8, 7, 0, 11, 3
    ]);
    deepEqual(t1.invert(-2), [
      10, 11, 7, 6, 2, 3, 1, 5, 4, 9, 8, 0
    ]);
  });

  it('computes the correct tonerow retrogradations', () => {
    deepEqual(t1.retrograde(1), [
      11, 3, 2, 7, 6, 10, 8, 9, 5, 4, 0, 1
    ]);
    deepEqual(t1.retrograde(-2), [
      8, 0, 11, 4, 3, 7, 5, 6, 2, 1, 9, 10
    ]);
  });

  it('computes the correct tonerow retrograde inversions', () => {
    deepEqual(t1.retrogradeInvert(1), [
      3, 11, 0, 7, 8, 4, 6, 5, 9, 10, 2, 1
    ]);
    deepEqual(t1.retrogradeInvert(-2), [
      0, 8, 9, 4, 5, 1, 3, 2, 6, 7, 11, 10
    ]);
  });

  it('computes the correct tonerow rotations', () => {
    deepEqual(t1.rotate(1), [
      11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10, 0
    ]);
    deepEqual(t1.rotate(-2, 2), [
      4, 0, 2, 1, 5, 6, 10, 9, 11, 7, 8, 3
    ]);
  });

  it('computes the correct tonerow matrix', () => {
    // @see http://composertools.com/Tools/matrix/MatrixCalc.html
    deepEqual(t1.matrix(), [
      [ 0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10 ],
      [ 1, 0, 4, 5, 9, 8, 10, 6, 7, 2, 3, 11 ],
      [ 9, 8, 0, 1, 5, 4, 6, 2, 3, 10, 11, 7 ],
      [ 8, 7, 11, 0, 4, 3, 5, 1, 2, 9, 10, 6 ],
      [ 4, 3, 7, 8, 0, 11, 1, 9, 10, 5, 6, 2 ],
      [ 5, 4, 8, 9, 1, 0, 2, 10, 11, 6, 7, 3 ],
      [ 3, 2, 6, 7, 11, 10, 0, 8, 9, 4, 5, 1 ],
      [ 7, 6, 10, 11, 3, 2, 4, 0, 1, 8, 9, 5 ],
      [ 6, 5, 9, 10, 2, 1, 3, 11, 0, 7, 8, 4 ],
      [ 11, 10, 2, 3, 7, 6, 8, 4, 5, 0, 1, 9 ],
      [ 10, 9, 1, 2, 6, 5, 7, 3, 4, 11, 0, 8 ],
      [ 2, 1, 5, 6, 10, 9, 11, 7, 8, 3, 4, 0 ]
    ]);
  });

});

describe('Chord', () => {
  const D = new Scale([2, 4, 6, 7, 9, 11, 13], +1 /* sharp +1 or flat -1 */);
  const Bb = new Scale([10, 12, 14, 15, 17, 19, 21], -1);
  const Dchords = Chord.chordsFromScale(D, 4 /* notes per chord */);

  it('generates correct note spellings', () => {
    deepEqual(D.spell(), ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
    deepEqual(Bb.spell(), ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  });

  it('generates correct chords from a scale', () => {
    deepEqual(Dchords.map( (chord) => { return chord.degrees; }),
    [
      [ 0, 2, 4, 6 ],
      [ 1, 3, 5, 7 ],
      [ 2, 4, 6, 8 ],
      [ 3, 5, 7, 9 ],
      [ 4, 6, 8, 10 ],
      [ 5, 7, 9, 11 ],
      [ 6, 8, 10, 12 ]
    ]);
  });

  it('names chords correctly', () => {
    deepEqual(Dchords.map( (chord) => { return chord.name(); }),
    [
      'Dmaj7', 'Em7', 'F#m7', 'Gmaj7', 'A7', 'Bm7', 'C#m7b5'
    ]);
  });
});
