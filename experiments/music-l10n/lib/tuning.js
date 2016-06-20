// tuning
// generate all pitches in a tuning

/**

EDO generates pitches between [1, 2[ (one octave)
which are separated by equal (logarithmic) divisions,

**/
export function EDO(steps) {
  this.steps = steps;
  this.pitches = this._pitches();
}

EDO.prototype._pitches = function() {
  return new Array(this.steps).fill(0).map(function(__, degree) {
    return Math.pow(2, degree/this.steps);
  }.bind(this));
}

/**

PhysicalTuning takes a generator such as EDO and
converts pitches to frequencies, given the
degree (index) of the pitch.

Starts at a given reference frequency.

**/
export function PhysicalTuning(generator, reference, precision) {
  this.pitches = generator.pitches;
  this.reference = reference;
  this.precision = precision;
}

/**

Degree can be any signed integer. It's a
0-based index into the infinite sequence of
octaves of the original pitches.

**/
PhysicalTuning.prototype.get = function(degree) {
  var octave = Math.floor(degree / this.pitches.length);
  var pitch = this.pitches[ degree.mod(this.pitches.length) ];
  return Math.round10(this.reference * pitch * Math.pow(2, octave), 0 - this.precision);
}
