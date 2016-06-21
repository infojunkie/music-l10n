import { deepEqual } from 'assert';
import _ from 'lodash';

import '../lib';
import { /*Interval, */Scale, Chord } from '../lib/chords.js';
import { EDO, Tuning } from '../lib/tuning.js';
import { ToneRow } from '../lib/tonerow.js';

describe('Tuning', () => {
  var concertTuning = new Tuning(EDO(12), 440);

  it('generates proper normalized pitch vectors for equal temperament tunings', () => {
    // @see https://en.wikipedia.org/wiki/Equal_temperament#Comparison_to_just_intonation
    deepEqual(_.range(13).map( (d) => { return concertTuning.getNormalizedPitch(d, 6); }),
    [
      1, 1.059463, 1.122462, 1.189207, 1.259921, 1.334840, 1.414214, 1.498307, 1.587401, 1.681793, 1.781797, 1.887749, 2
    ]);
  });

  it('generates proper frequencies from pitch vectors', () => {
    // https://en.wikipedia.org/wiki/Piano_key_frequencies
    deepEqual(_.range(13).map( (d) => { return concertTuning.getPitchFrequency(d, 3); }),
    [
      440, 466.164, 493.883, 523.251, 554.365, 587.330, 622.254, 659.255, 698.456, 739.989, 783.991, 830.609, 880
    ]);
  });
});

describe('ToneRow', () => {
  // @see https://en.wikipedia.org/wiki/Concerto_for_Nine_Instruments_(Webern)
  // @see http://composertools.com/Tools/matrix/MatrixCalc.html
  var t1 = new ToneRow([0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10]);

  it('computes the proper tonerow transforms', () => {
    t1;
    throw Error("TODO");
  });

  it('computes the proper tonerow matrix', () => {
    t1;
    throw Error("TODO");
  });
});

describe('Chord', () => {
  var D = new Scale([2, 4, 6, 7, 9, 11, 13], +1 /* sharp +1 or flat -1 */);
  var Bb = new Scale([10, 12, 14, 15, 17, 19, 21], -1);
  var Dchords = Chord.chordsFromScale(D, 4 /* notes per chord */);

  it('generates proper note spellings', () => {
    deepEqual(D.spell(), ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
    deepEqual(Bb.spell(), ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  });

  it('generates proper chords', () => {
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

  it('names chords properly', () => {
    deepEqual(Dchords.map( (chord) => { return chord.name(); }),
    [
      'Dmaj7', 'Em7', 'F#m7', 'Gmaj7', 'A7', 'Bm7', 'C#m7b5'
    ]);
  });
});
