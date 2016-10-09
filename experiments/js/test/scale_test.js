import { deepEqual } from 'assert';

import '../lib';
import { Scale } from '../lib/scale.js';

describe('Scale', () => {
  const D = Scale.fromTones([2, 4, 6, 7, 9, 11, 13], +1 /* sharp +1 or flat -1 */);
  const Bb = Scale.fromTones([10, 12, 14, 15, 17, 19, 21], -1);
  const Am = Scale.fromIntervals([2,1,2,2,1,2,2], 9, +1);
  const Dkurd = Scale.fromIntervals([1,2,2,2,1,2,2], 2, -1);

  it('saves its input', () => {
    deepEqual(D.tones, [2, 4, 6, 7, 9, 11, 13]);
    deepEqual(Am.intervals, [2,1,2,2,1,2,2]);
  });

  it('generates intervals from tones', () => {
    deepEqual(D.intervals, [2,2,1,2,2,2,1]);
    deepEqual(Bb.intervals, [2,2,1,2,2,2,1]);
  });

  it('generates tones from intervals', () => {
    deepEqual(Am.tones, [9, 11, 12, 14, 16, 17, 19], +1);
  });

  it('spells scale notes', () => {
    deepEqual(D.spell(), ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
    deepEqual(Bb.spell(), ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
    deepEqual(Am.spell(), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('generates modes', () => {
    deepEqual(D.modes(), [
      Scale.fromTones([2, 4, 6, 7, 9, 11, 13], +1),
      Scale.fromTones([4, 6, 7, 9, 11, 13, 14], +1),
      Scale.fromTones([6, 7, 9, 11, 13, 14, 16], +1),
      Scale.fromTones([7, 9, 11, 13, 14, 16, 18], +1),
      Scale.fromTones([9, 11, 13, 14, 16, 18, 19], +1),
      Scale.fromTones([11, 13, 14, 16, 18, 19, 21], +1),
      Scale.fromTones([13, 14, 16, 18, 19, 21, 23], +1)
    ]);
  });

  it('identifies scale names', () => {
    deepEqual(D.name({ skipModes: true }), ['D major']);
    deepEqual(Am.name({ skipModes: true }), ['A natural minor', 'A descending melodic minor']);
  });

  it('identifies scale modes', () => {
    const Dmodes = D.modes();
    deepEqual(Dmodes[1].name(), ['F# Kurd mode 7 on E', 'B natural minor mode 4 on E', 'B descending melodic minor mode 4 on E', 'D major mode 2 on E (Dorian)']);
    deepEqual(Dkurd.name(), ['D Kurd', 'G natural minor mode 5 on D', 'G descending melodic minor mode 5 on D', 'Bb major mode 3 on D (Phrygian)'])
  });

  it('spells scale intervals', () => {
    deepEqual(D.spellIntervals(), ['W', 'W', 'H', 'W', 'W', 'W', 'H']);
    deepEqual(Am.spellIntervals(), ['W', 'H', 'W', 'W', 'H', 'W', 'W']);
  });

  it('generates inverted known scales', () => {
    deepEqual(Scale.KNOWN_SCALES_EVERTED['%(root)s major'], '2,2,1,2,2,2,1');
    deepEqual(Scale.KNOWN_SCALES_EVERTED['%(root)s natural minor'], '2,1,2,2,1,2,2');
    deepEqual(Scale.KNOWN_SCALES_EVERTED['%(root)s descending melodic minor'], '2,1,2,2,1,2,2');
  });

  it('generates scale from name', () => {
    deepEqual(Scale.fromName('natural minor', 9, +1), Am);
  });

});
