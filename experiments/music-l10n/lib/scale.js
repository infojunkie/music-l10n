// scale functions

import sprintf from 'sprintf';

/* Scale */
export function Scale(intervals, tones, accidental_sign) {
  this.intervals = intervals;
  this.tones = tones;
  this.accidental_sign = accidental_sign;
}
Scale.fromTones = function(tones, accidental_sign) {
  return new Scale(
    tones.concat(tones[0] + Scale.TUNING_TONES).reduce( (intervals, tone, index, tones) => {
      return index ? intervals.concat(tone - tones[index - 1]) : intervals;
    }, []),
    tones,
    accidental_sign
  );
}
Scale.fromIntervals = function(intervals, start, accidental_sign) {
  return new Scale(
    intervals,
    intervals.reduce( (tones, interval, index) => {
      return tones.concat(tones[index] + interval);
    }, [start]).slice(0,-1),
    accidental_sign
  );
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
  return this.tones.map( (tone, degree) => {
    return scale.noteAt(degree);
  });
}
Scale.prototype.name = function() {
  const interval = this.intervals.join(',');
  var found = [];

  // Find matching scales.
  if (interval in Scale.KNOWN_SCALES) {
      found = found.concat(Scale.KNOWN_SCALES[interval].map( (name_template) => {
        return sprintf(name_template, { root: this.noteAt(0) });
      }));
  }

  return found;
}
Scale.prototype.modes = function() {
  // TODO
}
Scale.KNOWN_SCALES = {
  '2,2,1,2,2,2,1': [
    '%(root)s major'
  ],
  '2,1,2,2,1,2,2': [
    '%(root)s natural minor',
    '%(root)s descending melodic minor'
  ],
  '2,1,2,2,1,3,1': [
    '%(root)s harmonic minor'
  ],
  '2,1,2,2,2,2,1': [
    '%(root)s ascending melodic minor',
    '%(root)s jazz minor'
  ]
};
