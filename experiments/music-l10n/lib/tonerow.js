// tone row experiments

/**

  MODEL

  ToneRow is an ordered collection of pitch degrees with permutations.

  @see https://en.wikipedia.org/wiki/Permutation_(music)
  @see http://www.musictheory.net/calculators/matrix
  @see http://composertools.com/Tools/matrix/MatrixCalc.html

**/

export function ToneRow(prime) {
  this.prime = prime;
}

ToneRow.prototype._transpose = function(delta) {
  return function(pitch) {
    return (pitch + delta).mod(this.prime.length);
  }.bind(this);
}

ToneRow.prototype._invert = function(delta) {
  return function(pitch) {
    return (delta - pitch).mod(this.prime.length);
  }.bind(this);
}

ToneRow.prototype.transpose = function(delta) {
  return this.prime.map(this._transpose(delta));
}

ToneRow.prototype.invert = function(delta) {
  return this.prime.map(this._invert(delta));
}

ToneRow.prototype.retrograde = function(delta) {
  return this.prime.clone().reverse().map(this._transpose(delta));
}

ToneRow.prototype.retrogradeInvert = function(delta) {
  return this.prime.clone().reverse().map(this._invert(delta));
}

ToneRow.prototype.rotate = function(cycle, delta) {
  delta = delta || 0;
  const pitches = this.prime.clone();
  const head = pitches.splice(0, cycle.mod(pitches.length));
  return pitches.concat(head).map(this._transpose(delta));
}

ToneRow.prototype.matrix = function() {
  return this.prime.map(function(pitch) {
    return this.transpose(this._invert(0)(pitch));
  }.bind(this));
}
