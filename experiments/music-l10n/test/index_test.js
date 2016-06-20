import { deepEqual } from 'assert';
import _ from 'lodash';

import '../lib';
import { /*Interval, */Scale, Chord } from '../lib/chords.js';
import { EDO, PhysicalTuning } from '../lib/tuning.js';
import { ToneRow } from '../lib/tonerow.js';

describe('Tuning', () => {
  it ('manipulates tunings', () => {
    var edo12 = new EDO(12);
    console.log("Generating 12-EDO pitch vector\n", edo12.pitches);

    var concertTuning = new PhysicalTuning(edo12, 440, 3);
    console.log("Generating frequencies for standard A4 tuning\n", function(tuning) {
      return _.range(13).map(function(degree) {
          return this.get(degree);
      }.bind(tuning));
    }(concertTuning));
  });
});

describe('ToneRow', () => {
  it('manipulates tonerows', () => {
    var edo12 = new EDO(12);
    // Prime tone row from Webern's Concerto for Nine Instruments, Op. 24
    // https://en.wikipedia.org/wiki/Concerto_for_Nine_Instruments_(Webern)
    var t1 = new ToneRow([0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10], edo12);
    console.log("P0", t1.transpose(0));
    console.log("R0", t1.retrograde(0));
    console.log("I0", t1.invert(0));
    console.log("rotate(3,0)", t1.rotate(3, 0));
    console.log("P1", t1.transpose(1));
    console.log("R1", t1.retrograde(1));
    console.log("I1", t1.invert(1));
    console.log("rotate(3,1)", t1.rotate(3, 1));
    console.log("matrix\n", t1.matrix());
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
