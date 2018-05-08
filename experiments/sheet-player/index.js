import 'whatwg-fetch';
import WebMidi, { Output } from 'webmidi';
import $ from 'jquery';
import store from 'store';
import Vex from 'vexflow';
import tonal from 'tonal';
import Soundfont from 'soundfont-player';
import sheets from './sheets.json';
import soundfonts from './soundfonts.json';
import math from 'mathjs';
import parser from 'note-parser';

// Reach in deep structures without fear of TypeError exceptions.
// e.g. x = ORNULL(a.b.c.d['e'].f.g);
DEFINE_MACRO(ORNULL, (expr) => {
  try {
    return expr;
  }
  catch (e) {
    return null;
  }
});

// https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

Array.prototype.last = Array.prototype.last || function() {
  return this[this.length - 1];
};

Array.prototype.insert = Array.prototype.insert || function() {
  this.unshift(...arguments);
  return this;
}

Number.prototype.repeat = Number.prototype.repeat || function(f) {
  let n = this;
  while (n-- > 0) f();
}

// https://stackoverflow.com/a/28191966/209184
function keyOf(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

// Global state.
const MIDI_START_TIME = 1;

window.G = {
  midi: {
    ac: null,
    output: null,
    time: null,
    marker: null,
    bpm: 100,
    performance: null,
    tuning: null,
    timers: [],
    config: {
      output: 'local',
      sheet: 0,
      sync: 100, // the play marker is assumed to be 100 ms ahead of MIDI playback
      marker_mode: 'measure',
      melody: {
        soundfont: 'musyngkite',
        instrument: 'acoustic_grand_piano',
        channel: 1
      },
      percussion: {
        soundfont: 'doumbek',
        instrument: 'doumbek',
        channel: 10,
        on: false
      },
      tuning: '12tet',
      midi_tuning: 'mts',
      reference: {
        frequency: 440.0,
        note: 'A4'
      }
    }
  },
  sheets: sheets.data
};
// G is a global variable that is a proxy to window.G
// this allows to debug G in the JS console.
function SimpleProxy(target) {
  return new Proxy(target, {
    get: function(target, name) {
      return target[name];
    }
  });
}
var G = SimpleProxy(window.G);

//
// TUNING SYSTEM
//
// Given a reference note and a target note, a tuning returns the ratio between them.
// The fundamental interval is 2/1 between the base tone and its octave.
// Other tones subdivide the octave interval. A finite number of tones N make up the tuning.
// Tones are indexed according to their rank in the ordered sequence of ratios
// index 0 => ratio 1 (unison)
// index 1 => ratio 1.abc (first interval)
// index 2 => ratio 1.xyz (second interval)
// ...
// index N-1 => ratio 2 (octave)
//
//
// Indexes can be named: these are the "note names" such as C, D, E, etc.
// Also, index increments can be named: these are the accidentals such as ♯, ♭, ♮, etc.
//
//

function ratioToCents(ratio) {
  return Math.round(1200 * Math.log2(ratio));
}

function centsToRatio(cents) {
  return Math.pow(2, cents / 1200);
}

//
// Tuning base class
//
class Tuning {

  // CONSTRUCTOR
  //
  // `intervals`: an array of ratios expressed as strings or cents expressed as numbers.
  //  This array should NOT include the unison (1/1) interval.
  //  The last element of this array will be considered to be the repeater (e.g. 2/1 the octave).
  //
  // `nomenclature`: maps of note names and accidentals to index within the intervals sequence
  // ```
  // nomenclature: {
  //   notes: {
  //     'C': 0,
  //     'D': 2,
  //     'E': 4,
  //     'F': 5,
  //     ...
  //   },
  //   accidentals: {
  //     '#': +1,
  //     'b': -1,
  //     'n':  0,
  //     ...
  //   }
  // }
  // ```
  //
  // `reference`: reference note in scientific pitch notation
  //
  constructor(intervals, nomenclature, reference) {
    this.nomenclature = nomenclature;

    // Precalculated values
    // `regex` is the regular expression that is dynamically built to
    // recognize notes in scientific pitch notation, given the nomenclature supplied by the caller.
    this.regex = new RegExp(
      '^(' + Object.keys(nomenclature.notes).map(escapeRegExp).join('|') + ')' +
      '(' + Object.keys(nomenclature.accidentals).map(escapeRegExp).sort((a,b) => b.length - a.length).join('|') + ')?' +
      '(-?\\d)$',
      'i'
    );

    // `regexNoAccidentals` is a regex for note names only, to be used when an accidental is not found during parsing.
    this.regexNoAccidentals = new RegExp(
      '^(' + Object.keys(nomenclature.notes).map(escapeRegExp).join('|') + ')' +
      '\\D*' +
      '(-?\\d)$',
      'i'
    );

    // `reference` is the reference note information (index, octave)
    this.reference = this.parse(reference);

    // the internal `intervals` holds the interval multipliers in ratio form
    // with the unison added to simplify the code.
    this.steps = intervals.length;
    this.intervals = intervals.insert(0).map(i => {
      return typeof i === 'string' ? math.number(math.fraction(i)) : centsToRatio(i);
    });
  }

  // TUNE A NOTE
  // get a note's ratio to the reference
  //
  // `note`: target note in scientific pitch notation
  // return: ratio of note wrt reference or undefined if not recognized
  //
  tune(note) {
    const n = this.parse(note);
    if (!n) return;

    // Get the ratio difference between the target note and the reference note, raised to the difference in octave.
    // The octave is always the last tone as per the definition of the `intervals` array.
    return Math.pow(this.intervals.last(), n.octave - this.reference.octave) * this.intervals[ n.index ] / this.intervals[ this.reference.index ];
  }

  // OFFSET OF A NOTE
  // get the node offset with respect to the reference
  offsetOf(note) {
    const n = this.parse(note);
    if (!n) return;

    return (n.index - this.reference.index) + (n.octave - this.reference.octave) * this.steps;
  }

  // PARSE A NOTE
  // get a note's index and octave given its scientific pitch notation
  //
  // `note`: target note in scientific pitch notation
  // return: note information `{ index, octave }` or undefined if not recognized
  //
  parse(note) {
    let result;
    const match = this.regex.exec(note);
    if (match) {
      result = {
        index: this.nomenclature.notes[ match[1] ] + (match[2] ? this.nomenclature.accidentals[ match[2] ] : 0),
        octave: parseInt(match[3])
      };
    }
    else {
      console.error(`Could not parse note ${note}. Trying without accidentals...`);
      const match2 = this.regexNoAccidentals.exec(note);
      if (match2) {
        result = {
          index: this.nomenclature.notes[ match2[1] ],
          octave: parseInt(match2[2])
        };
      }
    }

    // Handle accidentals that push index across boundaries.
    if (result) {
      if (result.index < 0) {
        result.index += this.steps;
        result.octave -= 1;
      }
      else if (result.index >= this.steps) {
        result.index -= this.steps;
        result.octave += 1;
      }
    }
    return result;
  }
}

// Generate a tuning intervals array based on equal divisions of the octave.
// The intervals are calculated in cents, because they will be converted to ratios
// inside the Tuning constructor.
function tuningIntervalsEdo(divisions) {
  return Array.from(Array(divisions)).map((_e, i) => {
    return 1200 / divisions * (i+1);
  });
}

// Initialize known tunings.
const tunings = [
  {
    key: '12tet',
    name: 'Western standard tuning (12-tet)',
    tuning: new Tuning(tuningIntervalsEdo(12), {
      notes: {
        'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
      },
      accidentals: {
        'n': 0, '#': 1, 'b': -1, '##': 2, 'bb': -2
      }
    }, G.midi.config.reference.note)
  },
  {
    key: '24tet',
    name: 'Arabic quarter-tone tuning (24-tet)',
    tuning: new Tuning(tuningIntervalsEdo(24), {
      notes: {
        'C': 0, 'D': 4, 'E': 8, 'F': 10, 'G': 14, 'A': 18, 'B': 22
      },
      accidentals: {
        'n': 0, '#': 2, 'b': -2, '##': 4, 'bb': -4,
        '+': 1, '++': 3, 'bs': -1, 'bss': -3
      }
    }, G.midi.config.reference.note)
  },
  {
    key: 'villoteau',
    name: 'Arabic Villoteau third-tone tuning (36-tet)',
    tuning: new Tuning(tuningIntervalsEdo(36), {
      notes: {
        'C': 0, 'D': 6, 'E': 12, 'F': 15, 'G': 21, 'A': 27, 'B': 33
      },
      accidentals: {
        'n': 0, '#': 3, 'b': -3, '##': 6, 'bb': -6,
        '+': 2, '++': 4, 'bs': -2, 'bss': -4
      }
    }, G.midi.config.reference.note)
  },
  {
    key: 'meanquar',
    name: '1/4-comma meantone scale. Pietro Aaron\'s temperament (1523)',
    tuning: new Tuning(
      [76.04900, 193.15686, 310.26471, '5/4', 503.42157, 579.47057, 696.57843, '25/16', 889.73529, 1006.84314, 1082.89214, '2/1'],
      {
        notes: {
          'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        },
        accidentals: {
          'n': 0, '#': 1, 'b': -1, '##': 2, 'bb': -2
        }
      },
      G.midi.config.reference.note
    )
  }
];

// Local MIDI output class that conforms to WedMidi.Output interface.
class LocalMidiOutput {
  constructor() {
    this.instruments = {
      /*
      channel-num: {
        instrument,
        pb
      },
      ...
      */
    };
    this.load();
  }
  sendSysex(manufacturer, data, options) {
  }
  playNote(note, channel, options) {
    if (!this.instruments[channel]) return;

    const time = G.midi.ac.currentTime + eval(options.time) * 0.001;
    const duration = options.duration * 0.001;
    if (this.instruments[channel].pb) {
      note += (this.instruments[channel].pb);
    }
    this.instruments[channel].instrument.play(note, time, { duration });
  }
  sendPitchBend(pb, channel, options) {
    if (!this.instruments[channel]) return;
    this.instruments[channel].pb = pb * 2; // Local player counts microtones in fractions of semitones
  }
  stop() {
    for (var channel in this.instruments) {
      this.instruments[channel].instrument.stop();
    }
  }
  static nameToUrl(name, soundfont, format) {
    format = format || 'mp3';
    const url = soundfonts.data[soundfont].url;
    return url + name + '-' + format + '.js';
  }
  load() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    G.midi.ac = G.midi.ac || new AudioContext();
    $('#sheet #play').prop('disabled', true);
    this.instruments = {};
    Soundfont.instrument(G.midi.ac, G.midi.config.melody.instrument, { soundfont: G.midi.config.melody.soundfont, nameToUrl: LocalMidiOutput.nameToUrl})
    .then(instrument => {
      this.instruments[G.midi.config.melody.channel] = { instrument, pb: 0 };
      $('#sheet #play').prop('disabled', false);
    });
    Soundfont.instrument(G.midi.ac, G.midi.config.percussion.instrument, { soundfont: G.midi.config.percussion.soundfont, nameToUrl: LocalMidiOutput.nameToUrl})
    .then(instrument => {
      this.instruments[G.midi.config.percussion.channel] = { instrument, pb: 0 };
      $('#sheet #play').prop('disabled', false);
    });
  }
};

// Additional method on Vex.Flow.Factory that draws the score without resetting
// the info at the end - because we need to keep that info.
Vex.Flow.Factory.prototype.drawWithoutReset = function() {
  this.systems.forEach(i => i.setContext(this.context).format());
  this.staves.forEach(i => i.setContext(this.context).draw());
  this.voices.forEach(i => i.setContext(this.context).draw());
  this.renderQ.forEach(i => {
    if (!i.isRendered()) i.setContext(this.context).draw();
  });
  this.systems.forEach(i => i.setContext(this.context).draw());
}

// Given a key signature, find the sharps and flats.
function getKeyAccidentals(keySignature) {
  const accidentalsMap = {
    'G': { 'F': '#' },
    'D': { 'F': '#', 'C': '#' },
    'A': { 'F': '#', 'C': '#', 'G': '#' },
    'E': { 'F': '#', 'C': '#', 'G': '#', 'D': '#' },
    'B': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#' },
    'F#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#' },
    'C#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#', 'B': '#' },
    'F': { 'B': 'b' },
    'Bb': { 'B': 'b', 'E': 'b' },
    'Eb': { 'B': 'b', 'E': 'b', 'A': 'b' },
    'Ab': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b' },
    'Db': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b' },
    'Gb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b' },
    'Cb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b', 'F': 'b' }
  };
  const map = ORNULL(accidentalsMap[keySignature.keySpec]);
  const keys = Object.keys(map);
  keySignature.accList.forEach((acc, index) => {
    map[ keys[index] ] = acc.type;
  });
  return map;
}

//
// MIDI FUNCTIONS
//
// Since MIDI is an instrument / tuning, functions below should be moved to Tuning
// and generalized.
//
const MidiTuning = new Tuning(tuningIntervalsEdo(12), {
  notes: {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  },
  accidentals: {
    'n': 0, '#': 1, 'b': -1, '##': 2, 'bb': -2
  }
}, 'C-1'); // First note is the reference

// Convert MIDI note number to a note name.
function midiToNote(midi) {
  const notes = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];
  const note = notes[midi % notes.length];
  const octave = ((midi / notes.length) | 0) - 1;
  return `${note}${octave}`;
}

// Convert MIDI note number to a frequency.
function midiToFreq(m) {
  return Math.pow(2, (m - 69) / 12) * 440;
}

// Convert frequency to closest MIDI note number and pitch bend value [-1,1].
function freqToMidi(f) {
  const m = 12 * Math.log2(f / 440) + 69;
  const r = Math.round(m);
  return [ r, (m - r) / 2 ];
}

// Generate a MIDI tuning from a tuning object.
/*
Frequency Data Format

The frequency resolution of MIDI Tuning should be stringent enough to satisfy most demands of music and experimentation.
The specification provides resolution somewhat finer than one-hundredth of a cent. Instruments may support MIDI tuning
without necessarily providing this resolution in their hardware; the specification simply permits the transfer of tuning data at
any resolution up to this limit.

Frequency data shall be sent via system exclusive messages. Because system exclusive data bytes have their high bit set
low, containing 7 bits of data, a 3-byte (21-bit) frequency data word is used for specifying a frequency with the suggested
resolution. An instrument which does not support the full suggested resolution may discard any unneeded lower bits on
reception, but it is preferred where possible that full resolution be stored internally, for possible transmission to other
instruments which can use the increased resolution.

Frequency data shall be defined in units which are fractions of a semitone. The frequency range starts at MIDI note 0, C =
8.1758 Hz, and extends above MIDI note 127, G = 12543.875 Hz. The first byte of the frequency data word specifies the
nearest equal-tempered semitone below the frequency. The next two bytes (14 bits) specify the fraction of 100 cents above
the semitone at which the frequency lies. Effective resolution = 100 cents / 2^14 = .0061 cents.
One of these values ( 7F 7F 7F ) is reserved to indicate not frequency data but a "no change" condition. When an instrument
receives these bytes as frequency data, it should make no change to its stored frequency data for that MIDI key number.
This is to prevent instruments which do not use the full range of 128 MIDI key numbers from sending erroneous tuning data
to instrument which do use the full range. The three-byte frequency representation may be interpreted as follows:

0xxxxxxx 0abcdefg 0hijklmn
xxxxxxx = semitone
abcdefghijklmn = fraction of semitone, in .0061-cent units
*/
/*

https://github.com/MarkCWirt/MIDIUtil/blob/master/src/midiutil/MidiFile.py#L1563-L1592

def frequencyTransform(freq):
    '''
    Returns a three-byte transform of a frequency.
    '''
    resolution = 16384
    freq = float(freq)
    dollars = 69 + 12 * math.log(freq/(float(440)), 2)
    firstByte = int(dollars)
    lowerFreq = 440 * pow(2.0, ((float(firstByte) - 69.0)/12.0))
    centDif = 1200 * math.log((freq/lowerFreq), 2) if freq != lowerFreq else 0
    cents = round(centDif/100 * resolution)  # round?
    secondByte = min([int(cents) >> 7, 0x7F])
    thirdByte = cents - (secondByte << 7)
    thirdByte = min([thirdByte, 0x7f])
    if thirdByte == 0x7f and secondByte == 0x7F and firstByte == 0x7F:
        thirdByte = 0x7e
    thirdByte = int(thirdByte)
    return [firstByte,  secondByte,  thirdByte]


def returnFrequency(freqBytes):
    '''
    The reverse of frequencyTransform. Given a byte stream, return a frequency.
    '''
    resolution = 16384.0
    baseFrequency = 440 * pow(2.0, (float(freqBytes[0]-69.0)/12.0))
    frac = (float((int(freqBytes[1]) << 7) + int(freqBytes[2]))
            * 100.0) / resolution
    frequency = baseFrequency * pow(2.0, frac/1200.0)
    return frequency

*/
function freqToMidiTuning(freq) {
  const resolution = 16384;
  const dollars = 69 + 12 * Math.log2(freq / 440.0);
  const firstByte = Math.floor(dollars);
  const lowerFreq = 440.0 * Math.pow(2, (firstByte - 69) / 12);
  const centDif = 1200 * Math.log2(freq / lowerFreq);
  const cents = Math.round(centDif / 100 * resolution);
  const secondByte = Math.min(cents >> 7, 0x7F);
  const thirdByte = Math.round(cents - (secondByte << 7));
  return [firstByte, secondByte, thirdByte];
}

function generateMidiTuning(vf, tuning) {
  // Iterate through the notes to create a map from the tuning's
  // notes to MIDI notes.
  // We need to:
  // - index the note that will be played with its MIDI note number,
  //   so that we can look it up during playback
  // - index each MIDI note number with its tuning to send to the MIDI device
  // - ensure each MIDI note number is mapped to only one sheet note
  const map = vf.renderQ
    .filter(s => s instanceof Vex.Flow.StaveNote)
    .reduce((n, s) => {
      return n.concat(s.keyProps)
    }, [])
    .reduce((_map, n) => {
      // Lookup the note info in the target tuning.
      const note = ORNULL(tuning.tuning.nomenclature.notes[n.key]);
      const accidental = ORNULL(tuning.tuning.nomenclature.accidentals[n.accidental]);
      if (note === null) {
        console.error(`generateMidiTuning: Note ${n.key} not found in tuning ${tuning.key}.`);
        return;
      }
      if (n.accidental && accidental === null) {
        console.error(`generateMidiTuning: Accidental ${n.accidental} not found in tuning ${tuning.key}.`);
        return;
      }
      const name = `${n.key}${n.accidental || ''}${n.octave}`;

      // Lookup the MIDI number and bend of the note given the tuning.
      const freq = G.midi.config.reference.frequency * tuning.tuning.tune(name);
      const [midi, msb, lsb] = freqToMidiTuning(freq);
      if (midi < 0 || midi > 127) {
        console.error(`generateMidiTuning: Note ${name} maps to invalid MIDI note ${midi} under the tuning ${tuning.key}.`);
        return;
      }
      if (_map.midis[midi] && _map.midis[midi] != name) {
        console.error(`generateMidiTuning: Note ${name} clashes with note ${_map.midis[midi].name} for MIDI note ${midi} under the tuning ${tuning.key}.`);
        return;
      }

      _map.names[name] = { midi, freq, msb, lsb };
      if (!_map.midis[midi]) {
        _map.midis[midi] = name;
        _map.mts.push(midi, midi, msb, lsb);
      }
      return _map;
    }, { midis: {}, names: {}, mts: [] });

  // Send a universal sysex message.
  // http://www.microtonal-synthesis.com/MIDItuning.html
  G.midi.output.sendSysex(
    [], // manufacturer is not used
    [
      0x7E, // non-real-time
      0x7F, // channel
      0x08, // code 8 = MIDI Tuning Standard
      0x02, // subcode 2 = Single Note Tuning Change
      0x00, // tuning program
      map.mts.length,
      ...map.mts
    ]
  );

  G.midi.map = map;
}

// Convert a note to a MIDI message.
// Convert microtones into MIDI pitch bends.
function playNote(note, time, duration) {
  const noteName = `${note.key}${note.accidental||''}${note.octave}`;
  if (G.midi.config.midi_tuning === 'mts' && G.midi.config.output !== 'local') {
    const {midi, freq, msb, lsb} = G.midi.map.names[noteName];
    console.log({ noteName, midi, freq, msb, lsb });
    if (midi) {
      G.midi.output.playNote(midi, G.midi.config.melody.channel, {
        time: `+${time}`,
        duration: duration
      });
    }
  }
  else {
    const freq = G.midi.config.reference.frequency * G.midi.tuning.tuning.tune(noteName);
    const [ midi, pb ] = freqToMidi(freq);
    console.log({ noteName, freq, midi, pb });
    if (midi) {
      if (pb) {
        G.midi.output.sendPitchBend(pb, G.midi.config.melody.channel, { time: `+${time}` });
      }
      G.midi.output.playNote(midi, G.midi.config.melody.channel, {
        time: `+${time}`,
        duration: duration
      });
      if (pb) {
        const endTime = time + duration - 1; // -1 to help the synth order the events
        G.midi.output.sendPitchBend(0, G.midi.config.melody.channel, { time: `+${endTime}` });
      }
    }
  }
}

// Convert a percussion note to a MIDI message.
function playPercussion(note, time, duration) {
  const midi = parser.midi(note);
  if (midi) {
    G.midi.output.playNote(midi, G.midi.config.percussion.channel, {
      time: `+${time}`,
      duration: duration
    });
  }
}

// A performance is a sequence of sections.
class Performance {
  constructor() {
    this.sections = {};
    this.sequence = [];
  }
  addSection(key, section) {
    if (key === null) {
      return null;
    }
    if (Array.isArray(section) && !section.length) {
      return null;
    }
    if (section && !(key in this.sections)) {
      this.sections[key] = section;
    }
    this.sequence.push(key);
    return key;
  }
}

// Convert a Vex.Flow.Factory structure into a MIDI stream.
function parseVexFlow() {
  G.midi.performance = new Performance();

  // A section is a list of measures bounded by double barlines
  // or other bounding symbols.
  let section = [];

  // Current key signature.
  let keyAccidentals = null;

  // Timing information that will be calculated inside.
  const time = {
    start: 0,
    duration: 0,
    ticksToTime: 60000 / (G.midi.bpm * Vex.Flow.RESOLUTION / 4),
  };

  // A system is a full measure.
  G.vf.systems.forEach((system) => {
    section.push(system);

    // Remember which accidentals apply to which note keys.
    let measureAccidentals = [];

    // Remember the stave we've working with.
    let currentStave = null;

    // A system's formatter has an ordered list of all tick events, grouped in "tick contexts".
    system.formatter.tickContexts.list.forEach((tickStart) => {
      const tickContext = system.formatter.tickContexts.map[tickStart];

      tickContext.tickables.forEach((tickable) => {
        if (tickable instanceof Vex.Flow.StaveNote) {
          // Ignore staves we've already seen.
          if (tickable.stave != currentStave) {
            currentStave = tickable.stave;

            // Parse stave modifiers for key signature, time signature, etc.
            currentStave.modifiers.forEach((modifier) => {
              if (modifier instanceof Vex.Flow.KeySignature) {
                keyAccidentals = getKeyAccidentals(modifier);
              }
              if (modifier instanceof Vex.Flow.StaveTempo) {
                const ticksPerTempoUnit = Vex.Flow.parseNoteData({
                  duration: modifier.tempo.duration,
                  dots: modifier.tempo.dots,
                }).ticks;
                time.ticksToTime = 60000 / (modifier.tempo.bpm * ticksPerTempoUnit);
              }
              if (modifier instanceof Vex.Flow.Barline) {
                switch (modifier.type) {
                  case Vex.Flow.Barline.type.SINGLE:
                    break;
                  case Vex.Flow.Barline.type.DOUBLE:
                    G.midi.performance.addSection(ORNULL(section[0].attrs.id), section);
                    section = [];
                    break;
                  case Vex.Flow.Barline.type.END:
                    break;
                  case Vex.Flow.Barline.type.REPEAT_BEGIN:
                    break;
                  case Vex.Flow.Barline.type.REPEAT_END:
                  case Vex.Flow.Barline.type.REPEAT_BOTH:
                    Number(2).repeat(() => G.midi.performance.addSection(ORNULL(section[0].attrs.id), section));
                    section = [];
                    break;
                  case Vex.Flow.Barline.type.NONE:
                    break;
                }
              }
            });
          }

          // Compute time.
          time.start = Math.round(tickStart * time.ticksToTime);
          time.duration = Math.round(tickable.ticks.numerator * time.ticksToTime / tickable.ticks.denominator);

          // Parse note modifiers.
          tickable.modifiers.forEach((modifier) => {
            if (modifier instanceof Vex.Flow.Accidental) {
              measureAccidentals[ tickable.keyProps[modifier.index].key ] = modifier.type;
            }
          });

          // Compute MIDI information.
          tickable.midi = {
            start: time.start,
            duration: time.duration,
          };
          if (tickable.noteType === 'n') {
            tickable.keyProps.forEach((note) => {
              note.accidental =
                note.accidental ||
                ORNULL(measureAccidentals[note.key]) ||
                ORNULL(keyAccidentals[note.key]);
            });
          }
        }
      });
    });

    // Advance time by measure's total ticks.
    // The conversion factor was computed separately by each tickable due to the VexFlow format.
    system.midi = {
      duration: Math.round(system.formatter.totalTicks.numerator * time.ticksToTime / system.formatter.totalTicks.denominator),
    };
  });

  // Last remaining section.
  G.midi.performance.addSection(ORNULL(section[0].attrs.id), section);
}

// Play the sheet.
function play() {
  // This creates a G.midi.performance.
  parseVexFlow();

  // Initialize
  G.midi.time = MIDI_START_TIME;
  G.midi.timers = [];

  // Tune MIDI.
  if (G.midi.config.midi_tuning === 'mts' && G.midi.config.output !== 'local') {
    generateMidiTuning(G.vf, G.midi.tuning);
  }

  // Play.
  G.midi.performance.sequence.forEach((sectionKey) => {
    const section = G.midi.performance.sections[sectionKey];
    section.forEach((system) => {

      // Insert a percussion measure.
      if (G.midi.config.percussion.on) {
        playPercussion('f4', G.midi.time, 500);
      }

      // Play the notes.
      system.formatter.tickContexts.list.forEach((tickStart) => {
        const tickContext = system.formatter.tickContexts.map[tickStart];

        // Used to display play marker.
        let marker = {
          ctx: system.checkContext(),
          y1: system.options.y,
          y2: system.lastY,
          x1: G.midi.config.marker_mode == 'note' ? Number.MAX_SAFE_INTEGER : system.startX,
          x2: G.midi.config.marker_mode == 'note' ? 0 : system.startX + system.formatter.justifyWidth
        };

        tickContext.tickables.forEach((tickable) => {
          if (tickable instanceof Vex.Flow.StaveNote) {
            // Compute play marker position.
            if (G.midi.config.marker_mode == 'note') {
              const metrics = tickable.getMetrics();
              const xStart = tickable.getAbsoluteX() - metrics.modLeftPx - metrics.extraLeftPx;
              const xEnd = tickable.getAbsoluteX()
                + metrics.noteWidth
                + metrics.extraRightPx
                + metrics.modRightPx;
              marker.x1 = Math.min(marker.x1, xStart);
              marker.x2 = Math.max(marker.x2, xEnd);
            }

            // Output to MIDI.
            if (tickable.noteType === 'n') {
              tickable.keyProps.forEach((note) => {
                playNote(note, G.midi.time + tickable.midi.start, tickable.midi.duration);
              });
            }

            // Draw play marker.
            G.midi.timers.push(setTimeout(() => {
              const ctx = marker.ctx;
              if (G.midi.marker) {
                try {
                  ctx.svg.removeChild(G.midi.marker);
                }
                catch (e) {
                  // never mind.
                }
              }
              ctx.beginPath();
              ctx.setStrokeStyle('#aaa');
              ctx.setFillStyle('#aaa');
              ctx.setLineWidth(1);
              ctx.attributes.opacity = 0.2;
              ctx.fillRect(marker.x1, marker.y1, marker.x2 - marker.x1, marker.y2 - marker.y1);

              G.midi.marker = ctx.svg.lastChild;
            }, G.midi.time + tickable.midi.start + G.midi.config.sync));
          }
        });
      });

      G.midi.time += system.midi.duration;
    });
  });
}

const CANVAS_WIDTH=500;
const CANVAS_HEIGHT=200;

// Convert an array of notes to a Vex.Flow.Factory structure.
function notesToVexFlow(notes) {
  var vf_notes = notes.map((n) => `${n}/4`).join(', ');
  var time = `${notes.length}/4`;

  var vf = new Vex.Flow.Factory({
    renderer: {elementId: 'sheet-vexflow', width: CANVAS_WIDTH, height: CANVAS_HEIGHT}
  });
  var system = vf.System({
    width: CANVAS_WIDTH,
    formatIterations: 0,
  });

  var score = vf.EasyScore();
  var voice = score.voice(score.notes(vf_notes), { time: time });
  system
    .addStave({ voices: [voice] })
    .addClef('treble');

  return vf;
}

// Render a sheet.
// The core sheet structure is Vex.Flow.Factory.
// If the passed argument is an array of notes, convert it to a sheet.
// If the passed argument is a function, call it to get the sheet.
function render(notes) {
  // Render VexFlow model.
  const vf = Array.isArray(notes) ? notesToVexFlow(notes) : notes();
  vf.drawWithoutReset();

  console.log(vf);

  // Attach UI event handlers.
  function colorDescendants(color) {
    return function() {
      Vex.forEach($(this).find('*'), function(child) {
        child.setAttribute('fill', color);
        child.setAttribute('stroke', color);
      });
    };
  }
  vf.renderQ.forEach((renderable) => {
    if (renderable instanceof Vex.Flow.StaveNote) {
      var el = renderable.getAttribute('el');
      el.addEventListener('mouseover', colorDescendants('green'), false);
      el.addEventListener('mouseout', colorDescendants('black'), false);
    }
  });

  // Save VexFlow model.
  G.vf = vf;
}

//
// PROGRAM MAIN
// Initialize the Web MIDI system and the UI.
//
(function main() {

  // Read the saved configuration.
  G.midi.config = Object.assign({}, G.midi.config, store.get('G.midi.config'));

  // MIDI output
  $('#sheet #outputs').append($('<option>', { value: 'local', text: "(local synth)" }));
  $('#sheet #outputs').on('change', () => {
    const same = G.midi.config.output === $('#sheet #outputs').val()

    G.midi.config.output = $('#sheet #outputs').val();
    store.set('G.midi.config', G.midi.config);

    if (G.midi.config.output !== 'local' && WebMidi.enabled) {
      $('#sheet #soundfonts').prop('disabled', true);
      $('#sheet #instruments').prop('disabled', true);
      G.midi.output = WebMidi.getOutputById(G.midi.config.output);
    }
    else {
      $('#sheet #soundfonts').prop('disabled', false);
      $('#sheet #instruments').prop('disabled', false);

      // Don't reload everything needlessly.
      if (!same) {
        G.midi.output = new LocalMidiOutput();
      }
    }
  });

  // MIDI channel
  // [1..16] as per http://stackoverflow.com/a/33352604/209184
  Array.from(Array(16)).map((e,i)=>i+1).concat(['all']).forEach((channel) => {
    $('#sheet #channels').append($('<option>', { value: channel, text: channel }));
  });
  $('#sheet #channels').on('change', () => {
    G.midi.config.melody.channel = $('#sheet #channels').val();
    store.set('G.midi.config', G.midi.config);
  });
  $('#sheet #channels').val(G.midi.config.melody.channel).change();

  // MIDI tuning
  $('#sheet input[name="midi_tuning"][value=' + G.midi.config.midi_tuning + ']').attr('checked', 'checked');
  $('#sheet input[name="midi_tuning"]').on('change', () => {
    G.midi.config.midi_tuning = $('#sheet input[name="midi_tuning"]:checked').val();
    store.set('G.midi.config', G.midi.config);
  });

  // Soundfonts and instruments
  for (const sf in soundfonts.data) {
    const soundfont = soundfonts.data[sf];
    $('#sheet #soundfonts').append($('<option>', { text: soundfont.name, value: sf }));
  }
  $('#sheet #soundfonts').on('change', () => {
    G.midi.config.melody.soundfont = $('#sheet #soundfonts').val();
    store.set('G.midi.config', G.midi.config);

    // Update the instruments list.
    $('#sheet #instruments').empty();
    fetch(soundfonts.data[G.midi.config.melody.soundfont].url + 'names.json')
    .then(function(response) {
      return response.json();
    })
    .catch(function(e) {
      return ['acoustic_grand_piano'];
    })
    .then(function(instruments) {
      instruments.forEach((instrument) => {
        $('#sheet #instruments').append($('<option>', { text: instrument, value: instrument }));
      });
      if (instruments.indexOf(G.midi.config.melody.instrument) === -1) {
        G.midi.config.melody.instrument = instruments[0];
      }
      $('#sheet #instruments').val(G.midi.config.melody.instrument).change();
    });
  });
  $('#sheet #soundfonts').val(G.midi.config.melody.soundfont).change();
  $('#sheet #instruments').on('change', () => {
    G.midi.config.melody.instrument = $('#sheet #instruments').val();
    store.set('G.midi.config', G.midi.config);

    if ($('#sheet #instruments').prop('disabled')) return;
    G.midi.output = new LocalMidiOutput();
  });

  // Marker mode
  $('#sheet input[name="marker_mode"][value=' + G.midi.config.marker_mode + ']').attr('checked', 'checked');
  $('#sheet input[name="marker_mode"]').on('change', () => {
    G.midi.config.marker_mode = $('#sheet input[name="marker_mode"]:checked').val();
    store.set('G.midi.config', G.midi.config);
  });

  // Tuning
  tunings.forEach((tuning) => {
    $('#sheet #tunings').append($('<option>', { value: tuning.key, text: tuning.name }));
  });
  $('#sheet #tunings').on('change', () => {
    G.midi.config.tuning = $('#sheet #tunings').val();
    store.set('G.midi.config', G.midi.config);

    G.midi.tuning = tunings.find((t) => t.key === G.midi.config.tuning);
  });
  $('#sheet #tunings').val(G.midi.config.tuning).change();

  $('#sheet #reference').val(G.midi.config.reference.frequency);
  $('#sheet #reference').on('keyup', e => {
    if (e.keyCode == 13) {
      document.activeElement.blur();
    }
  });
  $('#sheet #reference').on('blur', e => {
    G.midi.config.reference.frequency = $('#sheet #reference').val();
    store.set('G.midi.config', G.midi.config);
  });

  // Handle reset button.
  $('#sheet #reset').on('click', () => {
    store.clear();
    location.reload();
  });

  // Handle "Play" button.
  $('#sheet #play').on('click', () => {
    $('#sheet #stop').trigger('click');
    $('#sheet #reference').val(G.midi.config.reference.frequency);
    play();
  });

  // Handle "Stop" button.
  $('#sheet #stop').on('click', () => {
    if (ORNULL(G.midi.output.stop)) {
      G.midi.output.stop();
    }
    else {
      // FIXME
      // https://github.com/WebAudio/web-midi-api/issues/102
      // https://bugs.chromium.org/p/chromium/issues/detail?id=471798
    }
    // Stop player marker.
    if (G.midi.timers) {
      G.midi.timers.forEach((timer) => { window.clearTimeout(timer); });
      delete G.midi.timers;
    }
  });

  // Build sheet list.
  G.sheets.unshift({
    name: 'Maqsum rhythm مقسوم',
    notes: () => maqsum()
  });
  G.sheets.push({
    name: 'C Lydian',
    notes: tonal.scale('C lydian').map((n) => `${n}4`).concat(['c5'])
  });
  G.sheets.unshift({
    name: 'Lamma bada yatathanna لما بدا يتثنى',
    notes: () => yatathanna()
  });
  G.sheets.unshift({
    name: 'Yâ lâbesyn يا لابسين',
    notes: () => labesyn()
  });
  G.sheets.unshift({
    name: 'Bach Minuet in G',
    notes: () => bach()
  });
  G.sheets.forEach((sheet, index) => {
    $('#sheet #sheets').append($('<option>', { value: index, text: sheet.name }));
  });
  $('#sheet #sheets').val(G.midi.config.sheet).on('change', () => {
    G.midi.config.sheet = $('#sheet #sheets').val();
    store.set('G.midi.config', G.midi.config);
    $('#sheet #sheet-vexflow').empty();
    render(G.sheets[G.midi.config.sheet].notes);
  });

  // Enable Web MIDI.
  WebMidi.enable(function (err) {
    if (err) {
      $('#sheet #outputs').val('local').change();
      console.error(`Web MIDI not enabled: ${err}`);
      return;
    }

    // Web MIDI outputs.
    let midiOutput = 'local';
    WebMidi.outputs.forEach((output) => {
      $('#sheet #outputs').append($('<option>', { value: output.id, text: output.name }));
      if (G.midi.config.output === output.id) {
        midiOutput = output.id;
      }
    });
    $('#sheet #outputs').val(midiOutput).change();

    // Listen to Web MIDI state events.
    WebMidi.addListener('connected', (event) => {
      if ($(`#sheet #outputs option[value="${event.id}"]`).length) return;
      $(`#sheet #outputs option:contains("${event.name}")`).remove();
      $('#sheet #outputs').append($('<option>', { value: event.id, text: event.name }));
      $('#sheet #outputs').change();
    });
    WebMidi.addListener('disconnected', (event) => {
      $(`#sheet #outputs option[value="${event.id}"]`).remove();
      $('#sheet #outputs').change();
    });

  }, true /* sysex */);

  // Render first sheet.
  render(G.sheets[G.midi.config.sheet].notes);
})();

//
// SHEETS
//

// Create a maqsum rhythm http://www.khafif.com/rhy/rhythmg.html
function maqsum() {
  var vf = new Vex.Flow.Factory({
    renderer: {elementId: 'sheet-vexflow', width: 1100, height: 900}
  });
  var score = vf.EasyScore({throwOnError: true});

  var voice = score.voice.bind(score);
  var notes = score.notes.bind(score);
  var beam = score.beam.bind(score);

  var x = 20, y = 80;
  function makeSystem(width) {
    var system = vf.System({x: x, y: y, width: width, spaceBetweenStaves: 10});
    x += width;
    return system;
  }

  function id(id) { return registry.getElementById(id); }

  score.set({time: '4/4'});

  /*  Measure 1 */
  var system = makeSystem(500);
  system.addStave({
    voices: [voice(notes('a4, c5, b4/r, c5, a4, b4/r, c5, b4/r', {stem: "up"}))]
  })
  .addClef('percussion')
  .addTimeSignature('4/4')
  .setEndBarType(Vex.Flow.Barline.type.REPEAT_END);

  system.addConnector('singleLeft');

  return vf;
}

// Create a sheet of https://musescore.com/infojunkie/lamma-bada-yatathanna
function yatathanna() {
  var vf = new Vex.Flow.Factory({
    renderer: {elementId: 'sheet-vexflow', width: 1100, height: 900}
  });
  var score = vf.EasyScore({throwOnError: true});

  var voice = score.voice.bind(score);
  var notes = score.notes.bind(score);
  var beam = score.beam.bind(score);

  var x = 20, y = 80;
  function makeSystem(width) {
    var system = vf.System({x: x, y: y, width: width, spaceBetweenStaves: 10});
    x += width;
    return system;
  }

  function id(id) { return registry.getElementById(id); }

  score.set({time: '10/8'});

  /*  Pickup measure  */
  var system = makeSystem(200);
  system.addStave({
    voices: [voice(notes('d4/8', {stem: "up"})).setStrict(false)]
  })
  .addKeySignature('Bb')
  .addClef('treble')
  .addTimeSignature('10/8')
  .setTempo({ duration: "8", bpm: 120}, -30)
  .setEndBarType(Vex.Flow.Barline.type.DOUBLE);

  /*  Measure 1 */
  var system = makeSystem(680);
  system.addStave({
    voices: [
      voice(notes('g4/q', {stem: "up"})
      .concat(beam(notes('a4/16, b4/16', {stem: "up"})))
      .concat(beam(notes('c5/16, b4/16, b4/16, a4/16', {stem: "down"})))
      .concat(beam(notes('a4/16, g4/16, g4/16, f#4/16', {stem: "up"})))
      .concat(notes('g4/q, d4/8', {stem: "up"}))
    )]
  });

  x = 20;
  y += 100;

  /*  Measure 2 */
  var system = makeSystem(800);
  system.addStave({
    voices: [
      voice(notes('g4/q', {stem: "up"})
      .concat(beam(notes('a4/16, b4/16', {stem: "up"})))
      .concat(beam(notes('c5/16, b4/16, b4/16, a4/16', {stem: "down"})))
      .concat(beam(notes('a4/16, g4/16, g4/16, f#4/16', {stem: "up"})))
      .concat(notes('g4/q, b4/8/r', {stem: "up"}))
    )]
  })
  .setEndBarType(Vex.Flow.Barline.type.END);

  return vf;
}

// Create a sheet of https://musescore.com/infojunkie/ya-labesyn
function labesyn() {
  var vf = new Vex.Flow.Factory({
    renderer: {elementId: 'sheet-vexflow', width: 1100, height: 900}
  });
  var score = vf.EasyScore({throwOnError: true});

  var voice = score.voice.bind(score);
  var notes = score.notes.bind(score);
  var beam = score.beam.bind(score);

  var x = 20, y = 80;
  function makeSystem(width) {
    var system = vf.System({x: x, y: y, width: width, spaceBetweenStaves: 10});
    x += width;
    return system;
  }

  function id(id) { return registry.getElementById(id); }

  score.set({time: '2/4'});

  /*  Measure 1 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(notes('b4/r, f4', {stem: "up"}).concat(beam(notes('f4, f4', {stem: "up"}))))]
  })
  .addKeySignature('D', undefined, ['+', '+'])
  .addClef('treble')
  .addTimeSignature('2/4')
  .setTempo({ name: "Moderato", duration: "q", bpm: 108}, -30);
  system.addConnector('singleLeft');

  /*  Measure 2 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(notes('f4/q', {stem: "up"}).concat(beam(notes('e4, f4', {stem: "up"}))))]
  });

  /*  Measure 3 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(beam(notes('g4, a4', {stem: "up"})).concat(beam(notes('g4, f4', {stem: "up"}))))]
  });

  /*  Measure 4 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(beam(notes('g4, f4', {stem: "up"})).concat(notes('e4/q', {stem: "up"})))]
  });

  /*  Measure 5 */
  x = 20;
  y += 100;

  var system = makeSystem(220);
  system.addStave({
    voices: [voice(notes('b4/r, e4', {stem: "up"}).concat(beam(notes('e4, e4', {stem: "up"}))))]
  });
  system.addConnector('singleLeft');

  /*  Measure 6 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(notes('e4/q', {stem: "up"}).concat(beam(notes('d4, e4', {stem: "up"}))))]
  });

  /*  Measure 7 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(beam(notes('f4, g4', {stem: "up"})).concat(beam(notes('e4, f4', {stem: "up"}))))]
  });

  /*  Measure 8 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(notes('d4/q, b4/q/r', {stem: "up"}))]
  });

  return vf;
}

// Create a sheet of Bach's Minuet in G.
// https://github.com/0xfe/vexflow/blob/master/tests/bach_tests.js
function bach() {
  var registry = new Vex.Flow.Registry();
  Vex.Flow.Registry.enableDefaultRegistry(registry);
  var vf = new Vex.Flow.Factory({
    renderer: {elementId: 'sheet-vexflow', width: 1100, height: 900}
  });
  var score = vf.EasyScore({throwOnError: true});

  var voice = score.voice.bind(score);
  var notes = score.notes.bind(score);
  var beam = score.beam.bind(score);

  var x = 120, y = 80;
  function makeSystem(width) {
    var system = vf.System({x: x, y: y, width: width, spaceBetweenStaves: 10});
    x += width;
    return system;
  }

  function id(id) { return registry.getElementById(id); }
  function concat(a,b) { return a.concat(b); }

  score.set({time: '3/4'});

  /*  Measure 1 */
  var system = makeSystem(220);
  system.addStave({
    voices: [
      voice([
        notes('D5/q[id="m1a"]'),
        beam(notes('G4/8, A4, B4, C5', {stem: "up"}))
      ].reduce(concat)),
      voice([vf.TextDynamics({text: 'p', duration: 'h', dots: 1, line: 9 })]),
    ]
  })
    .addClef('treble')
    .addKeySignature('G')
    .addTimeSignature('3/4')
    .setTempo({ name: "Allegretto", duration: "h", dots: 1, bpm: 66}, -30);

  system.addStave({ voices: [voice(notes('(G3 B3 D4)/h, A3/q', {clef: 'bass'}))] })
    .addClef('bass').addKeySignature('G').addTimeSignature('3/4');
  system.addConnector('brace');
  system.addConnector('singleRight');
  system.addConnector('singleLeft');

  id('m1a').addModifier(0, vf.Fingering({number: '5'}));

  /*  Measure 2 */
  system = makeSystem(150);
  system.addStave({ voices: [voice(notes('D5/q[id="m2a"], G4[id="m2b"], G4[id="m2c"]'))] });
  system.addStave({ voices: [voice(notes('B3/h.', {clef: 'bass'}))] });
  system.addConnector('singleRight');

  id('m2a').addModifier(0, vf.Articulation({type: 'a.', position: "above"}));
  id('m2b').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));
  id('m2c').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));

  vf.Curve({
    from: id('m1a'),
    to: id('m2a'),
    options: { cps: [{x: 0, y: 40}, {x: 0, y: 40}]}
  });

  /*  Measure 3 */
  system = makeSystem(150);
  system.addStave({
    voices: [
      voice([
        notes('E5/q[id="m3a"]'),
        beam(notes('C5/8, D5, E5, F5', {stem: "down"}))
      ].reduce(concat))
    ]
  });
  id('m3a').addModifier(0, vf.Fingering({number: '3', position: 'above'}));

  system.addStave({ voices: [ voice(notes('C4/h.', {clef: 'bass'})) ] });
  system.addConnector('singleRight');

  /*  Measure 4 */
  system = makeSystem(150);
  system.addStave({ voices: [ voice(notes('G5/q[id="m4a"], G4[id="m4b"], G4[id="m4c"]')) ] });

  system.addStave({ voices: [ voice(notes('B3/h.', {clef: 'bass'})) ] });
  system.addConnector('singleRight');

  id('m4a').addModifier(0, vf.Articulation({type: 'a.', position: "above"}));
  id('m4b').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));
  id('m4c').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));

  vf.Curve({
    from: id('m3a'),
    to: id('m4a'),
    options: { cps: [{x: 0, y: 20}, {x: 0, y: 20}]}
  });

  /*  Measure 5 */
  system = makeSystem(150);
  system.addStave({
    voices: [
      voice([
        notes('C5/q[id="m5a"]'),
        beam(notes('D5/8, C5, B4, A4', {stem: "down"}))
      ].reduce(concat))
    ]
  });
  id('m5a').addModifier(0, vf.Fingering({number: '4', position: 'above'}));

  system.addStave({ voices: [ voice(notes('A3/h.', {clef: 'bass'})) ] });
  system.addConnector('singleRight');

  /*  Measure 6 */
  system = makeSystem(150);
  system.addStave({
    voices: [
      voice([
        notes('B5/q'),
        beam(notes('C5/8, B4, A4, G4[id="m6a"]', {stem: "up"}))
      ].reduce(concat))
    ]
  });

  system.addStave({ voices: [ voice(notes('G3/h.', {clef: 'bass'})) ] });
  system.addConnector('singleRight');

  vf.Curve({
    from: id('m5a'),
    to: id('m6a'),
    options: {
      cps: [{x: 0, y: 20}, {x: 0, y: 20}],
      invert: true,
      position_end: 'nearTop',
      y_shift: 20,
    }
  });

  /*  Measure 7 (New system) */
  x = 20;
  y += 230;

  var system = makeSystem(220);
  system.addStave({
    voices: [
      voice([
        notes('F4/q[id="m7a"]'),
        beam(notes('G4/8[id="m7b"], A4, B4, G4', {stem: "up"}))
      ].reduce(concat))
    ]
  }).addClef('treble').addKeySignature('G');

  system.addStave({ voices: [voice(notes('D4/q, B3[id="m7c"], G3', {clef: 'bass'}))] })
    .addClef('bass').addKeySignature('G');
  system.addConnector('brace');
  system.addConnector('singleRight');
  system.addConnector('singleLeft');

  id('m7a').addModifier(0, vf.Fingering({number: '2', position: 'below'}));
  id('m7b').addModifier(0, vf.Fingering({number: '1'}));
  id('m7c').addModifier(0, vf.Fingering({number: '3', position: 'above'}));

  /*  Measure 8 */
  system = makeSystem(180);
  var grace = vf.GraceNote({keys: ['d/3'], clef: 'bass', duration: '8', slash: true });

  system.addStave({ voices: [voice(notes('A4/h.[id="m8c"]'))] });
  system.addStave({ voices: [
     score.set({clef: 'bass'}).voice([
        notes('D4/q[id="m8a"]'),
        beam(notes('D3/8, C4, B3[id="m8b"], A3', {stem: "down"}))
      ].reduce(concat))
  ]});
  system.addConnector('singleRight');

  id('m8b').addModifier(0, vf.Fingering({number: '1', position: 'above'}));
  id('m8c').addModifier(0, vf.GraceNoteGroup({notes: [grace]}));

  vf.Curve({
    from: id('m7a'),
    to: id('m8c'),
    options: {
      cps: [{x: 0, y: 20}, {x: 0, y: 20}],
      invert: true,
      position: 'nearTop',
      position_end: 'nearTop',
    }
  });

  vf.StaveTie({from: grace, to: id('m8c')});

  /*  Measure 9 */
  var system = makeSystem(180);
  system.addStave({
    voices: [
      score.set({clef: 'treble'}).voice([
        notes('D5/q[id="m9a"]'),
        beam(notes('G4/8, A4, B4, C5', {stem: "up"}))
      ].reduce(concat))
    ]
  });

  system.addStave({ voices: [voice(notes('B3/h, A3/q', {clef: 'bass'}))] });
  system.addConnector('singleRight');

  id('m9a').addModifier(0, vf.Fingering({number: '5'}));

  /*  Measure 10 */
  system = makeSystem(170);
  system.addStave({ voices: [voice(notes('D5/q[id="m10a"], G4[id="m10b"], G4[id="m10c"]'))] });
  system.addStave({ voices: [voice(notes('G3/q[id="m10d"], B3, G3', {clef: 'bass'}))] });
  system.addConnector('singleRight');

  id('m10a').addModifier(0, vf.Articulation({type: 'a.', position: "above"}));
  id('m10b').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));
  id('m10c').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));
  id('m10d').addModifier(0, vf.Fingering({number: '4'}));

  vf.Curve({
    from: id('m9a'),
    to: id('m10a'),
    options: { cps: [{x: 0, y: 40}, {x: 0, y: 40}]}
  });

   /*  Measure 11 */
  system = makeSystem(150);
  system.addStave({
    voices: [
      voice([
        notes('E5/q[id="m11a"]'),
        beam(notes('C5/8, D5, E5, F5', {stem: "down"}))
      ].reduce(concat))
    ]
  });
  id('m11a').addModifier(0, vf.Fingering({number: '3', position: 'above'}));

  system.addStave({ voices: [ voice(notes('C4/h.', {clef: 'bass'})) ] });
  system.addConnector('singleRight');

  /*  Measure 12 */
  system = makeSystem(170);
  system.addStave({ voices: [ voice(notes('G5/q[id="m12a"], G4[id="m12b"], G4[id="m12c"]')) ] });

  system.addStave({
    voices: [
      score.set({clef: 'bass'}).voice([
        notes('B3/q[id="m12d"]'),
        beam(notes('C4/8, B3, A3, G3[id="m12e"]', {stem: "down"}))
      ].reduce(concat))
    ]
  });
  system.addConnector('singleRight');

  id('m12a').addModifier(0, vf.Articulation({type: 'a.', position: "above"}));
  id('m12b').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));
  id('m12c').addModifier(0, vf.Articulation({type: 'a.', position: "below"}));

  id('m12d').addModifier(0, vf.Fingering({number: '2', position: 'above'}));
  id('m12e').addModifier(0, vf.Fingering({number: '4', position: 'above'}));

  vf.Curve({
    from: id('m11a'),
    to: id('m12a'),
    options: { cps: [{x: 0, y: 20}, {x: 0, y: 20}]}
  });

  /*  Measure 13 (New system) */
  x = 20;
  y += 230;

  var system = makeSystem(220);
  system.addStave({
    voices: [
      score.set({clef: 'treble'}).voice([
        notes('c5/q[id="m13a"]'),
        beam(notes('d5/8, c5, b4, a4', {stem: "down"}))
      ].reduce(concat))
    ]
  }).addClef('treble').addKeySignature('G');

  system.addStave({ voices: [voice(notes('a3/h[id="m13b"], f3/q[id="m13c"]', {clef: 'bass'}))] })
    .addClef('bass').addKeySignature('G');

  system.addConnector('brace');
  system.addConnector('singleRight');
  system.addConnector('singleLeft');

  id('m13a').addModifier(0, vf.Fingering({number: '4', position: 'above'}));
  id('m13b').addModifier(0, vf.Fingering({number: '1'}));
  id('m13c').addModifier(0, vf.Fingering({number: '3', position: 'above'}));

  /*  Measure 14 */
  var system = makeSystem(180);
  system.addStave({
    voices: [
      score.set({clef: 'treble'}).voice([
        notes('B4/q'),
        beam(notes('C5/8, b4, a4, g4', {stem: "up"}))
      ].reduce(concat))
    ]
  });

  system.addStave({ voices: [voice(notes('g3/h[id="m14a"], b3/q[id="m14b"]', {clef: 'bass'}))] });
  system.addConnector('singleRight');

  id('m14a').addModifier(0, vf.Fingering({number: '2'}));
  id('m14b').addModifier(0, vf.Fingering({number: '1'}));

   /*  Measure 15 */
  var system = makeSystem(180);
  system.addStave({
    voices: [
      score.set({clef: 'treble'}).voice([
        notes('a4/q'),
        beam(notes('b4/8, a4, g4, f4[id="m15a"]', {stem: "up"}))
      ].reduce(concat))
    ]
  });

  system.addStave({ voices: [voice(notes('c4/q[id="m15b"], d4, d3', {clef: 'bass'}))] });
  system.addConnector('singleRight');

  id('m15a').addModifier(0, vf.Fingering({number: '2'}));
  id('m15b').addModifier(0, vf.Fingering({number: '2'}));

   /*  Measure 16 */
  var system = makeSystem(130);
  system.addStave({
    voices: [
      score.set({clef: 'treble'}).voice([
        notes('g4/h.[id="m16a"]'),
      ].reduce(concat))
    ]
  }).setEndBarType(Vex.Flow.Barline.type.REPEAT_END);

  system.addStave({ voices: [voice(notes('g3/h[id="m16b"], g2/q', {clef: 'bass'}))] })
    .setEndBarType(Vex.Flow.Barline.type.REPEAT_END);
  system.addConnector('boldDoubleRight');

  id('m16a').addModifier(0, vf.Fingering({number: '1'}));
  id('m16b').addModifier(0, vf.Fingering({number: '1'}));

  vf.Curve({
    from: id('m13a'),
    to: id('m16a'),
    options: {
      cps: [{x: 0, y: 50}, {x: 0, y: 20}],
      invert: true,
      position_end: 'nearTop',
    }
  });

  /* Measure 17 */
  var system = makeSystem(180);
  system.addStave({
    voices: [
      score.set({clef: 'treble'}).voice([
        notes('b5/q[id="m17a"]'),
        beam(notes('g5/8, a5, b5, g5', {stem: "down"}))
      ].reduce(concat)),
      voice([vf.TextDynamics({text: 'mf', duration: 'h', dots: 1, line: 10 })]),
    ]
  }).setBegBarType(Vex.Flow.Barline.type.REPEAT_BEGIN);

  system.addStave({ voices: [voice(notes('g3/h.', {clef: 'bass'}))] })
    .setBegBarType(Vex.Flow.Barline.type.REPEAT_BEGIN);

  system.addConnector('boldDoubleLeft');
  system.addConnector('singleRight');

  id('m17a').addModifier(0, vf.Fingering({number: '5', position: 'above'}));

  /* Measure 18 */
  var system = makeSystem(180);
  system.addStave({
    voices: [
      score.set({clef: 'treble'}).voice([
        notes('a5/q[id="m18a"]'),
        beam(notes('d5/8, e5, f5, d5[id="m18b"]', {stem: "down"}))
      ].reduce(concat))
    ]
  });

  system.addStave({ voices: [voice(notes('f3/h.', {clef: 'bass'}))] });
  system.addConnector('singleRight');

  id('m18a').addModifier(0, vf.Fingering({number: '4', position: 'above'}));

  vf.Curve({
    from: id('m17a'),
    to: id('m18b'),
    options: {
      cps: [{x: 0, y: 20}, {x: 0, y: 30}],
    }
  });

  Vex.Flow.Registry.disableDefaultRegistry();
  return vf;
}
