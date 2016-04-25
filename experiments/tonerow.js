// tone row experiments

require('./goodparts.js');
var Tuning = require('./tuning.js');

/**

  MODEL

  ToneRow is an ordered collection of the pitches of a given tuning.

  @see http://www.musictheory.net/calculators/matrix
  @see http://composertools.com/Tools/matrix/MatrixCalc.html

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
  return this.prime.slice().reverse().map(this._transpose(delta));
}

ToneRow.prototype.rotate = function(cycle, delta) {
  var pitches = this.prime.slice();
  var head = pitches.splice(0, cycle.mod(pitches.length));
  pitches.push.apply(pitches, head);
  return pitches.map(this._transpose(delta));
}

ToneRow.prototype.matrix = function() {
  return this.prime.map(function(pitch, index) {
    return this.transpose( this._invert(0)(pitch) );
  }.bind(this));
}

var edo12 = new Tuning.EDO(12);

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

module.export = {
  ToneRow: ToneRow
}
