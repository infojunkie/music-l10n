// tuning
// generate all pitches in a tuning

import _ from 'lodash';

export function Tuning(generator, reference) {
  this.pitches = generator();
  this.reference = reference;
}

/**
  Degree can be any signed integer. It's a
  0-based index into the infinite sequence of
  octaves of the original pitches.
**/
Tuning.prototype.getPitch = function(degree) {
  var pitch = this.pitches[ degree.mod(this.pitches.length) ];
  var octave = Math.floor(degree / this.pitches.length);
  return [pitch, octave];
}

/**
  Get the normalized pitch (decimal factor)
  at the given degree, with the required precision.
**/
Tuning.prototype.getNormalizedPitch = function(degree, precision) {
  var [pitch, octave] = this.getPitch(degree);
  return Math.round10(pitch * Math.pow(2, octave), 0 - precision);
}

/**
  Get the frequency of a degree, with the required precision.
**/
Tuning.prototype.getPitchFrequency = function(degree, precision) {
  var [pitch, octave] = this.getPitch(degree);
  return Math.round10(this.reference * pitch * Math.pow(2, octave), 0 - precision);
}

/**
  EDO/tET generates pitches between [1, 2[ (one octave)
  which are separated by equal (logarithmic) divisions,
**/
export function EDO(steps) {
  return () => {
    return _.range(steps).map( (d) => {
      return Math.pow(2, d / steps);
    });
  }
}
