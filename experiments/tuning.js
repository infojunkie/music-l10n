// tuning
// generate all pitches in a tuning

/**
 MODEL

 EDO is the space of equal division of an octave into any number of pitch intervals

 */

function EDO(intervals) {
  this.intervals = intervals;
  this.pitches = this._pitches();
}

EDO.prototype._pitches = function() {
  return new Array(this.intervals+1).fill(0).map(function(__, degree) {
    return Math.pow(2, degree/this.intervals);
  }.bind(this));
}

var edo12 = new EDO(12);
console.log(edo12.pitches);

module.exports.EDO = EDO;
