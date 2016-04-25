// tone row experiments

require('./goodparts.js');
var Tuning = require('./tuning.js');

/**

  MODEL

  ToneRow is an ordered collection of the pitches of a given tuning.

**/

function ToneRow(prime, tuning) {
  this.prime = prime;
  this.tuning = tuning;
}

ToneRow.prototype._transpose = function(delta) {
  return function(pitch) {
    return (pitch + delta).mod(this.tuning.pitches.length);
  }.bind(this);
}

ToneRow.prototype._invert = function(delta) {
  return function(pitch) {
    return (delta - pitch).mod(this.tuning.pitches.length);
  }.bind(this);
}

ToneRow.prototype.transpose = function(delta) {
  return this.prime.map(this._transpose(delta));
}

ToneRow.prototype.invert = function(delta) {
  return this.prime.map(this._invert(delta));
}

ToneRow.prototype.retrograde = function(delta) {
  return this.prime.reverse().map(this._transpose(delta));
}

ToneRow.prototype.rotate = function(cycle, delta) {
  var pitches = this.prime;
  var head = pitches.splice(0, cycle.mod(pitches.length));
  pitches.push.apply(pitches, head);
  return pitches.map(this._transpose(delta));
}

var edo12 = new Tuning.EDO(12);

// Prime tone row from Webern's Concerto for Nine Instruments, Op. 24
// https://en.wikipedia.org/wiki/Concerto_for_Nine_Instruments_(Webern)

var t1 = new ToneRow([0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10], edo12);
console.log(t1.transpose(0));
console.log(t1.retrograde(0));
console.log(t1.invert(0));
console.log(t1.rotate(2, 0));
