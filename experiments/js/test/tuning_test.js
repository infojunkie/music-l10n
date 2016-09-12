import { deepEqual } from 'assert';
import _ from 'lodash';

import '../lib';
import { EDO, Tuning } from '../lib/tuning.js';

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
