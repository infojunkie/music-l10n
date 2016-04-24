// chord generation
// Given a scale, return all its chords up to the required depth

var R = require('ramda');

/* Interval */
function Interval(toneFrom, toneTo) {
  this.toneFrom = Math.min(toneFrom, toneTo);
  this.toneTo = Math.max(toneTo, toneFrom);
  this.delta = this.toneTo - this.toneFrom;
}
Interval.INTERVALS_TO_NAMES = {
  0: 'P1',
  1: 'm2',
  2: 'M2',
  3: 'm3',
  4: 'M3', // FIXME aka d4
  5: 'P4',
  6: 'A4', // FIXME aka d5
  7: 'P5',
  8: 'm6', // FIXME aka A5
  9: 'M6',
  10: 'm7',
  11: 'M7',
  12: 'P8',
  13: 'b9',
  14: '9',
  15: '#9',
  16: 'b11',
  17: '11',
  18: '#11',
  19: 'b13',
  20: '13',
  21: '#13'
};
Interval.prototype.name = function() {
  // FIXME Take into account degree differences in order to distinhuish between d4 vs M3, d5 vs A4, etc.
  // FIXME Take into account deltas outside of the range.
  return Interval.INTERVALS_TO_NAMES[this.delta];
}

/* Scale */
function Scale(tones, accidental_sign) {
  this.tones = tones;
  this.accidental_sign = accidental_sign; // +1 == #, -1 == b
}
Scale.TUNING_TONES = 12;
Scale.TUNING_NAMES_TO_TONES = {
  'C': 0,
  'D': 2,
  'E': 4,
  'F': 5,
  'G': 7,
  'A': 9,
  'B': 11
};
Scale.TUNING_TONES_TO_NAMES = {
  0: 'C',
  2: 'D',
  4: 'E',
  5: 'F',
  7: 'G',
  9: 'A',
  11: 'B'
};
Scale.prototype.toneAt = function(degree) {
  // Find the base tone and then raise it to the given octave
  // Remember the degree is [-inf, +inf]
  // To understand a / b | 0, see http://stackoverflow.com/questions/7487977/using-bitwise-or-0-to-floor-a-number
  return this.tones[ degree % this.tones.length ] +
         (degree / this.tones.length | 0) * Scale.TUNING_TONES;
}
Scale.prototype.noteAt = function(degree) {
  var tone = this.toneAt(degree);
  var base = tone % Scale.TUNING_TONES;
  var name = Scale.TUNING_TONES_TO_NAMES[base];
  if (!name) {
    // We have an intermediate tone: get the accidental
    var adjusted_base = (base - this.accidental_sign) % Scale.TUNING_TONES;
    var accidental = this.accidental_sign > 0 ? '#' : 'b';
    name = Scale.TUNING_TONES_TO_NAMES[adjusted_base] + accidental;
  }
  return name;
}
Scale.prototype.spell = function() {
  var scale = this;
  return this.tones.map(function(tone, degree) {
    return scale.noteAt(degree);
  });
}

/* Chord */
function Chord(scale, degrees) {
  this.scale = scale;
  this.degrees = degrees;
}
Chord.prototype.tones = function() {
  var chord = this;
  return this.degrees.map(function(degree) {
    return chord.scale.toneAt(degree);
  });
}
Chord.prototype.spell = function() {
  var chord = this;
  return this.degrees.map(function(degree) {
    return chord.scale.noteAt(degree);
  });
}
Chord.prototype.name = function() {
  var chord = this;
  var tones = this.tones();
  // FIXME sort the intervals
  var intervals = R.map(function(a) { return new Interval(a[0], a[1]); }, R.map(function(a) { return [tones[0], a]; }, R.drop(1, tones)));
  var names = [];

  // Chord naming: @see https://en.wikipedia.org/wiki/Chord_names_and_symbols_(popular_music)
  // Root
  names.push(this.scale.noteAt(this.degrees[0]));
  names.concat(R.map(function(interval) {
    var iname = interval.name();
    switch (iname) {
      case 'm3': names.push('m'); break;
      case 'M3': break;
      case 'P5': break;
      case 'A4': names.push('-5'); break;
      case 'm6': names.push('+5'); break;
      case 'm7': names.push('7'); break;
      case 'M7': names.push('Δ7'); break;
      default: names.push(iname); break;
    }
  }, intervals));
  // Assemble the name parts.
  return names.join('');
}
Chord.chordsFromScale = function(scale, depth) {
  return scale.tones.map(function(tone, degree) {
    return new Chord(scale, R.range(0, depth).map(function(d) {
      return degree + 2 * d;
    }));
  });
}

var D = new Scale([2,4,6,7,9,11,13], +1);
console.log(D.spell());
var Dchords = Chord.chordsFromScale(D, 5);
console.log(Dchords.map(function(chord) {
  return chord.name();
}));
var Bb = new Scale([10,12,14,15,17,19,21], -1);
console.log(Bb.spell());
