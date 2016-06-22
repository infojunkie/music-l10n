import { deepEqual } from 'assert';

import '../lib';
import { /*Interval, */Scale, Chord } from '../lib/chord.js';

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
