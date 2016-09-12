// chord functions

import _ from 'lodash';

/* Interval */
export function Interval(toneFrom, toneTo) {
  this.toneFrom = Math.min(toneFrom, toneTo);
  this.toneTo = Math.max(toneTo, toneFrom);
  this.delta = this.toneTo - this.toneFrom;
}
Interval.INTERVALS_TO_NAMES = {
  0: 'P1',
  1: 'm2',
  2: 'M2',
  3: 'm3',
  4: 'M3/d4',
  5: 'P4',
  6: 'A4/d5',
  7: 'P5',
  8: 'A5/m6',
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

export function Chord(scale, degrees) {
  this.scale = scale;
  this.degrees = degrees;
}
Chord.prototype.tones = function() {
  var chord = this;
  return this.degrees.map( (degree) => {
    return chord.scale.toneAt(degree);
  });
}
Chord.prototype.spell = function() {
  var chord = this;
  return this.degrees.map( (degree) => {
    return chord.scale.spellAt(degree);
  });
}
Chord.prototype.name = function() {
  var tones = this.tones().fsort( (a,b) => { return a-b; } );
  var intervals = tones.slice(1).map( (t) => { return new Interval(tones[0], t); });
  var parts = [];

  // Chord naming: @see https://en.wikipedia.org/wiki/Chord_names_and_symbols_(popular_music)
  parts.push(this.scale.spellAt(this.degrees[0]));
  var alt_fifth = false; // functional programming cries...
  parts.concat(intervals.map( (i) => {
    var iname = i.name();
    switch (iname) {
      case 'P1': break;
      case 'm2': break;
      case 'M2': break;
      case 'm3': parts.push('m'); break;
      case 'M3/d4': break;
      case 'P4': break;
      case 'P5': break;
      case 'A4/d5': alt_fifth = true; parts.push('b5'); break;
      case 'A5/m6': alt_fifth = true; parts.push('#5'); break;
      case 'm7': if (alt_fifth) parts.insert(-1, '7'); else parts.push('7'); break;
      case 'M7': if (alt_fifth) parts.insert(-1, 'maj7'); else parts.push('maj7'); break;
      case 'P8': break;
      default: parts.push(iname); break;
    }
  }));
  return parts.join('');
}
Chord.chordsFromScale = function(scale, depth) {
  return scale.tones.map( (tone, degree) => {
    return new Chord(scale, _.range(0, depth).map( (d) => {
      return degree + 2 * d;
    }));
  });
}
