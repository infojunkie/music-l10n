import { deepEqual } from 'assert';

import '../lib';
import { Scale } from '../lib/scale.js';

describe('Scale', () => {
  const D = Scale.fromTones([2, 4, 6, 7, 9, 11, 13], +1 /* sharp +1 or flat -1 */);
  const Bb = Scale.fromTones([10, 12, 14, 15, 17, 19, 21], -1);
  const Am = Scale.fromIntervals([2,1,2,2,1,2,2], 9);

  it('generates correct intervals from tones', () => {
    deepEqual(D.intervals, [2,2,1,2,2,2,1]);
    deepEqual(Bb.intervals, [2,2,1,2,2,2,1]);
  });

  it('generates correct tones from intervals', () => {
    deepEqual(Am.tones, [9, 11, 12, 14, 16, 17, 19], +1);
  });

  it('generates correct note spellings', () => {
    deepEqual(D.spell(), ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
    deepEqual(Bb.spell(), ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
    deepEqual(Am.spell(), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('generates correct modes', () => {
    deepEqual(D.modes(), [
      Scale.fromTones([2, 4, 6, 7, 9, 11, 13], +1),
      Scale.fromTones([4, 6, 7, 9, 11, 13, 14], +1),
      Scale.fromTones([6, 7, 9, 11, 13, 14, 16], +1),
      Scale.fromTones([7, 9, 11, 13, 14, 16, 18], +1),
      Scale.fromTones([9, 11, 13, 14, 16, 18, 10], +1),
      Scale.fromTones([11, 13, 14, 16, 18, 19, 21], +1),
      Scale.fromTones([13, 14, 16, 18, 19, 21, 23], +1)
    ]);
  });

  it('identifies scale names correctly', () => {
    deepEqual(D.name(), ['D major']);
    deepEqual(Am.name(), ['A natural minor', 'A descending melodic minor']);
  });

});
