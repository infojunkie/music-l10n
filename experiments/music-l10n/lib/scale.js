// scale functions

import sprintf from 'sprintf';

/**
  A scale holds simultaneously the TONES that compose it,
  and the INTERVALS between those tones.

  The accidentalSign unfortunately determines whether
  the scale is "sharp" or "flat" - only used for spelling
  out the scale notes.
**/
export function Scale(intervals, tones, accidentalSign) {
  this.intervals = intervals;
  this.tones = tones;
  this.accidentalSign = accidentalSign;
}
/**
  Given the scale tones, generate the intervals.
**/
Scale.fromTones = function(tones, accidentalSign) {
  return new Scale(
    tones.concat(tones[0] + Scale.TUNING_TONES).reduce( (intervals, tone, index, tones) => {
      return index ? intervals.concat(tone - tones[index - 1]) : intervals;
    }, []),
    tones,
    accidentalSign
  );
}
/**
  Given the scale intervals and a starting tone, generate the tones.
**/
Scale.fromIntervals = function(intervals, startTone, accidentalSign) {
  return new Scale(
    intervals,
    intervals.reduce( (tones, interval, index) => {
      return tones.concat(tones[index] + interval);
    }, [startTone]).slice(0,-1),
    accidentalSign
  );
}
/**
  Given the scale name, find the scale.
  TODO
 **/
Scale.fromName = function(/*name, startTone*/) {
}
/**
  Tuning constants
  TODO Replace with tuning.js
**/
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
/**
  Given the degree (step number in the scale), find the corresponding tone.
  Degree's range is [-inf, +inf], so raise the tone to the right octave.
**/
Scale.prototype.toneAt = function(degree) {
  // To understand a / b | 0, see http://stackoverflow.com/questions/7487977/using-bitwise-or-0-to-floor-a-number
  return this.tones[ degree % this.tones.length ] +
         (degree / this.tones.length | 0) * Scale.TUNING_TONES;
}
/**
  Given the degree, spell the note name, taking accidentalSign into consideration.
**/
Scale.prototype.spellAt = function(degree) {
  var tone = this.toneAt(degree);
  var base = tone % Scale.TUNING_TONES;
  var name = Scale.TUNING_TONES_TO_NAMES[base];
  if (!name) {
    // We have an intermediate tone: get the accidental
    var adjusted_base = (base - this.accidentalSign) % Scale.TUNING_TONES;
    var accidental = this.accidentalSign > 0 ? '#' : 'b';
    name = Scale.TUNING_TONES_TO_NAMES[adjusted_base] + accidental;
  }
  return name;
}
/**
  Spell the whole scale.
**/
Scale.prototype.spell = function() {
  var scale = this;
  return this.tones.map( (tone, degree) => {
    return scale.spellAt(degree);
  });
}
/**
  Spell the interval vector.
**/
Scale.prototype.spellIntervals = function() {
  return this.intervals.map( (interval) => {
    return Scale.INTERVAL_NAMES[interval];
  });
}
/**
  Name the scale, given its intervals and tones.

  Known scales are indexed by their interval vectors.
  Each interval vector may refer to several names,
  because the same scale can be called several names,
  e.g. ascending melodic minor and jazz minor.

  Optionally, modes can also be detected. A mode is
  a scale made up by rotating (cycling) the original scale's
  tone vector, yielding familiar examples such as Dorian, Mixolydian, etc.
  Those mode names can be optionally defined alongside the known scale names.
**/
Scale.prototype.name = function(skipModes) {
  const interval = this.intervals.join(',');
  var found = [];
  const scale = this;

  // Find matching scales.
  if (interval in Scale.KNOWN_SCALES) {
    found = found.concat(Scale.KNOWN_SCALES[interval].names.map( (name) => {
      return sprintf(name, { root: this.spellAt(0) });
    }));
  }

  // Find matching mode.
  if (!skipModes) {
    found = found.concat(scale.modes().reduce( (names, mode, modeNumber) => {
      return names.concat(mode.name(true).map( (name) => {
        // TODO find mode name if any
        return sprintf('%s mode %d on %s', name, scale.intervals.length - modeNumber + 1, scale.spellAt(0));
      }));
    }, []));
  }

  return found;
}
/**
  Generate all modes of a scale.
  An array of scales is returned.
**/
Scale.prototype.modes = function() {
  // cycle on intervals
  //   generate scale from each rotated interval
  const scale = this;
  return this.intervals.map( (interval, delta) => {
    var intervals = scale.intervals.clone();
    var head = intervals.splice(0, delta);
    return Scale.fromIntervals(
      intervals.concat(head),
      scale.toneAt(delta),
      scale.accidentalSign
    );
  });
}
/**
  Known scales database.
**/
Scale.KNOWN_SCALES = {
  '2,2,1,2,2,2,1': {
    names: [
      '%(root)s major'
    ],
    modes: [
      'Ionian',
      'Dorian',
      'Phrygian',
      'Lydian',
      'Mixolydian',
      'Aeolian',
      'Locrian'
    ]
  },
  '2,1,2,2,1,2,2': {
    names: [
      '%(root)s natural minor',
      '%(root)s descending melodic minor'
    ]
  },
  '2,1,2,2,1,3,1': {
    names: [
      '%(root)s harmonic minor'
    ]
  },
  '2,1,2,2,2,2,1': {
    names: [
      '%(root)s ascending melodic minor',
      '%(root)s jazz minor'
    ]
  },
  '1,2,1,2,1,2,2': {
    names: [
      '%(root)s Phrygian dominant',
      'Hijaz|حجاز'
    ]
  }
};
//Scale.KNOWN_SCALES_INVERTED = Scale.KNOWN_SCALES.invert('names');
Scale.INTERVAL_NAMES = {
  1: 'H',
  2: 'W'
}
