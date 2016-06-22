import { deepEqual } from 'assert';

import '../lib';
import { ToneRow } from '../lib/tonerow.js';

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
