// mode generation
// given a scale, generate all its modes

/**
 MODEL

 TuningSpace is the space of tones between [1,2]
 EDO is the space of equal division of an octave into any number of pitch intervals

 AbstractScale is a scale whose root is always pitch 0.

 */

function EDO(intervals) {
  this.intervals = intervals;
}

EDO.prototype.pitches = function() {
  return new Array(this.intervals+1).fill(0).map(function(__, degree) {
    return Math.pow(2, degree/this.intervals);
  }.bind(this));
}

var edo12 = new EDO(12);
console.log(edo12.pitches());
