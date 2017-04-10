import 'whatwg-fetch';
import WebMidi, { Output } from 'webmidi';
import $ from 'jquery';
import store from 'store';
import Vex from 'vexflow';
import tonal from 'tonal';
import Soundfont from 'soundfont-player';
import NoteParser from 'note-parser';
import sheets from './sheets.json';
import soundfonts from './soundfonts.json';

const MIDI_PB_QUARTER_TONE = 0.25;
const MIDI_PB_THIRD_TONE = 1/3;

// For now, a tuning is a mapping from accidentals to MIDI pitch bends
// https://github.com/0xfe/vexflow/wiki/Microtonal-Support
class Tuning {
  constructor(accidentalsMap) {
    this.accidentalsMap = accidentalsMap;
  }
  noteToMidi(key, accidental, octave) {
    const pb = ORNULL(this.accidentalsMap[accidental]);
    if (pb) { accidental = null };
    const keyAccidentalOctave = key + (accidental || '') + octave;
    let midi = NoteParser.midi(keyAccidentalOctave);
    if (!midi) {
      console.log(`Could not parse note ${keyAccidentalOctave}. Trying without accidental.`);
      midi = NoteParser.midi(key+octave);
    }
    return [ midi, pb ];
  }
}

// Initialize known tunings.
const tunings = [
  {
    key: '12tet',
    name: 'Western standard tuning (12-tet)',
    tuning: new Tuning(),
  },
  {
    key: '24tet',
    name: 'Arabic quarter-tone tuning (24-tet)',
    tuning: new Tuning({
      '+': MIDI_PB_QUARTER_TONE,
      '++': MIDI_PB_QUARTER_TONE * 3,
      'bs': -MIDI_PB_QUARTER_TONE,
      'bss': -MIDI_PB_QUARTER_TONE * 3,
    }),
  },
  {
    key: 'villoteau',
    name: 'Arabic Villoteau third-tone tuning',
    tuning: new Tuning({
      '+': MIDI_PB_THIRD_TONE,
      '++': MIDI_PB_THIRD_TONE * 2,
      'bs': -MIDI_PB_THIRD_TONE,
      'bss': -MIDI_PB_THIRD_TONE * 2,
    }),
  }
];

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

function concat(a, b) { return a.concat(b); }

const MIDI_START_TIME = 1;

// Global state
let G = {
  midi: {
    ac: null,
    output: null,
    time: MIDI_START_TIME,
    marker: null,
    bpm: 100,
    performance: {
      sections: []
    },
    tuning: null,
    timers: [],
    config: {
      output: null,
      channel: 0,
      sheet: 0,
      sync: 100, // the play marker is assumed to be 100 ms ahead of MIDI playback
      marker_mode: 'measure',
      soundfont: 'musyngkite',
      instrument: 'acoustic_grand_piano',
      drum: 'doumbek',
      tuning: '12tet',
    }
  },
  sheets: sheets.data
};

// Local MIDI output class that conforms to WedMidi.Output interface.
class LocalMidiOutput {
  constructor() {
    this.pb = 0;
    this.instrument = null;
    this.load();
  }
  playNote(note, channel, options) {
    const time = G.midi.ac.currentTime + eval(options.time) * 0.001;
    const duration = options.duration * 0.001;
    if (this.pb) {
      note += (this.pb*2); // Local player counts microtones in fractions of semitones
    }
    if (this.instrument) this.instrument.play(note, time, { duration });
  }
  sendPitchBend(pb, channel, options) {
    this.pb = pb;
  }
  stop() {
    if (this.instrument) this.instrument.stop();
  }
  load() {
    const that = this;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    G.midi.ac = G.midi.ac || new AudioContext();
    $('#sheet #play').prop('disabled', true);
    Soundfont.instrument(G.midi.ac, G.midi.config.instrument, { soundfont: G.midi.config.soundfont, nameToUrl: (name, soundfont, format) => {
      format = format || 'mp3';
      const url = soundfonts.data[soundfont].url;
      return url + name + '-' + format + '.js';
    }})
    .then(function (instrument) {
      that.instrument = instrument;
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
  return ORNULL(accidentalsMap[keySignature.keySpec]);
}

// Convert a note to a MIDI message.
// Convert microtones into MIDI pitch bends.
function playNote(note, time, duration) {
  const [ midi, pb ] = G.midi.tuning.tuning.noteToMidi(note.key, note.accidental, note.octave);
  if (!midi) return;
  if (pb) {
    G.midi.output.sendPitchBend(pb, G.midi.config.channel, { time: `+${time}` });
  }
  G.midi.output.playNote(midi, G.midi.config.channel, {
    time: `+${time}`,
    duration: duration
  });
  if (pb) {
    const endTime = time + duration;
    G.midi.output.sendPitchBend(0, G.midi.config.channel, { time: `+${endTime}` });
  }
}

class Section {
  constructor() {
    this.key = null; // section label
    this.repeat = 1; // number of times this section should be played
    this.systems = [];
  }
};

// Convert a Vex.Flow.Factory structure into a MIDI stream.
function parseVexFlow() {
  G.midi.performance = {
    sections: []
  };

  // Current key signature.
  let keyAccidentals = null;

  // Timing information that will be calculated inside.
  const time = {
    start: 0,
    duration: 0,
    ticksToTime: 60000 / (G.midi.bpm * Vex.Flow.RESOLUTION / 4),
  };

  // A section is bounded by double barlines
  // or other bounding symbols.
  let currentSection = new Section();

  // A system is a full measure.
  G.vf.systems.forEach((system) => {
    currentSection.systems.push(system);

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
                  case Vex.Flow.Barline.type.SINGLE: // 1
                    break;
                  case Vex.Flow.Barline.type.DOUBLE: // 2
                    G.midi.performance.sections.push(currentSection);
                    currentSection = new Section();
                    break;
                  case Vex.Flow.Barline.type.END: // 3
                    break;
                  case Vex.Flow.Barline.type.REPEAT_BEGIN: // 4
                    break;
                  case Vex.Flow.Barline.type.REPEAT_END: // 5
                    currentSection.repeat = 2;
                    G.midi.performance.sections.push(currentSection);
                    currentSection = new Section();
                    break;
                  case Vex.Flow.Barline.type.REPEAT_BOTH: // 6
                    break;
                  case Vex.Flow.Barline.type.NONE: // 7
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
  G.midi.performance.sections.push(currentSection);
}

// Play the sheet.
function play() {
  // This creates a G.midi.performance.
  parseVexFlow();

  // Play the performance.
  G.midi.time = MIDI_START_TIME;
  G.midi.timers = [];
  G.midi.performance.sections.forEach((section) => {
    for (var i=1; i<=section.repeat; i++) {
      section.systems.forEach((system) => {
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
    }
  });
}

const CANVAS_WIDTH=500;
const CANVAS_HEIGHT=200;

// Convert an array of notes to a Vex.Flow.Factory structure.
function renderVexFlow(notes) {
  var vf_notes = notes.map((n) => n + '/4').join(', ');
  var time = '' + notes.length + '/4';

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
  var vf;
  if (Array.isArray(notes)) {
    vf = renderVexFlow(notes);
  }
  else {
    vf = notes();
  }

  // Render and save Vex.Flow.Factory.
  vf.drawWithoutReset();

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

  // Remember VexFlow structure.
  G.vf = vf;
}

// Initialize the Web MIDI system and the UI.
WebMidi.enable(function (err) {
  // Read the saved configuration.
  G.midi.config = Object.assign({}, G.midi.config, store.get('G.midi.config'));

  // MIDI Output.
  $('#sheet #outputs').append($('<option>', { value: 'local', text: "(local synth)" }));
  WebMidi.outputs.forEach((output) => {
    $('#sheet #outputs').append($('<option>', { value: output.id, text: output.name }));
  });
  $('#sheet #outputs').on('change', () => {
    G.midi.config.output = $('#sheet #outputs').val();
    store.set('G.midi.config', G.midi.config);
    if (G.midi.config.output !== 'local') {
      $('#sheet #soundfonts').prop('disabled', true);
      $('#sheet #instruments').prop('disabled', true);
      G.midi.output = WebMidi.getOutputById(G.midi.config.output);
    }
    else {
      $('#sheet #soundfonts').prop('disabled', false);
      $('#sheet #instruments').prop('disabled', false);
      G.midi.output = new LocalMidiOutput();
    }
  });
  $('#sheet #outputs').val(G.midi.config.output).change();

  // Listen to Web MIDI state events.
  WebMidi.addListener('connected', (event) => {
    if ($('#sheet #outputs option[value="' + event.id + '"]').length) return;
    $('#sheet #outputs').append($('<option>', { value: event.id, text: event.name }));
  });
  WebMidi.addListener('disconnected', (event) => {
    $('#sheet #outputs option[value="' + event.id + '"]').remove();
  });

  // MIDI Channel.
  // [1..16] as per http://stackoverflow.com/a/33352604/209184
  Array.from(Array(16)).map((e,i)=>i+1).concat(['all']).forEach((channel) => {
    $('#sheet #channels').append($('<option>', { value: channel, text: channel }));
  });
  $('#sheet #channels').val(G.midi.config.channel).change();

  // Soundfonts and instruments.
  for (const sf in soundfonts.data) {
    const soundfont = soundfonts.data[sf];
    $('#sheet #soundfonts').append($('<option>', { text: soundfont.name, value: sf }));
  }
  $('#sheet #soundfonts').on('change', () => {
    G.midi.config.soundfont = $('#sheet #soundfonts').val();
    store.set('G.midi.config', G.midi.config);
    G.midi.output = new LocalMidiOutput();

    // Update the instruments list.
    $('#sheet #instruments').empty();
    fetch(soundfonts.data[G.midi.config.soundfont].url + 'names.json')
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
      if (instruments.indexOf(G.midi.config.instrument) === -1) {
        G.midi.config.instrument = instruments[0];
      }
      $('#sheet #instruments').val(G.midi.config.instrument).change();
    });
  });
  $('#sheet #soundfonts').val(G.midi.config.soundfont).change();
  $('#sheet #instruments').on('change', () => {
    G.midi.config.instrument = $('#sheet #instruments').val();
    store.set('G.midi.config', G.midi.config);
    G.midi.output = new LocalMidiOutput();
  });

  // Marker mode.
  $('#sheet input[name="marker_mode"][value=' + G.midi.config.marker_mode + ']').attr('checked', 'checked');

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

  // Handle "Play" button.
  $('#sheet #play').on('click', () => {
    $('#sheet #stop').trigger('click');
    G.midi.config.channel = $('#sheet #channels').val();
    G.midi.config.marker_mode = $('#sheet input[name="marker_mode"]:checked').val();
    store.set('G.midi.config', G.midi.config);
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

  // Build sheets.
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
    notes: () => villoteau()
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

  // Render first sheet.
  render(G.sheets[G.midi.config.sheet].notes);
});

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
  var system = makeSystem(120);
  system.addStave({
    voices: [voice(notes('d4/8', {stem: "up"})).setStrict(false)]
  })
  .addClef('treble')
  .addTimeSignature('10/8')
  .setTempo({ duration: "8", bpm: 120}, -30)
  .setEndBarType(Vex.Flow.Barline.type.DOUBLE);

  /*  Measure 1 */
  var system = makeSystem(680);
  system.addStave({
    voices: [
      voice(notes('g4/q', {stem: "up"})
      .concat(beam(notes('a4/16, bb4/16', {stem: "up"})))
      .concat(beam(notes('c5/16, bb4/16, bb4/16, a4/16', {stem: "down"})))
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
      .concat(beam(notes('a4/16, bb4/16', {stem: "up"})))
      .concat(beam(notes('c5/16, bb4/16, bb4/16, a4/16', {stem: "down"})))
      .concat(beam(notes('a4/16, g4/16, g4/16, f#4/16', {stem: "up"})))
      .concat(notes('g4/q, b4/8/r', {stem: "up"}))
    )]
  })
  .setEndBarType(Vex.Flow.Barline.type.END);

  return vf;
}

// Create a sheet of https://musescore.com/infojunkie/ya-labesyn
function villoteau() {
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
    voices: [voice(notes('b4/r, f+4', {stem: "up"}).concat(beam(notes('f4, f4', {stem: "up"}))))]
  })
  .addClef('treble')
  .addTimeSignature('2/4')
  .setTempo({ name: "Moderato", duration: "q", bpm: 108}, -30);
  system.addConnector('singleLeft');

  /*  Measure 2 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(notes('f+4/q', {stem: "up"}).concat(beam(notes('e4, f4', {stem: "up"}))))]
  });

  /*  Measure 3 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(beam(notes('g4, a4', {stem: "up"})).concat(beam(notes('g4, f+4', {stem: "up"}))))]
  });

  /*  Measure 4 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(beam(notes('g4, f+4', {stem: "up"})).concat(notes('e4/q', {stem: "up"})))]
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
    voices: [voice(beam(notes('f+4, g4', {stem: "up"})).concat(beam(notes('e4, f4', {stem: "up"}))))]
  });

  /*  Measure 8 */
  var system = makeSystem(220);
  system.addStave({
    voices: [voice(notes('d4/q, b4/q/r', {stem: "up"}))]
  })
  .setEndBarType(Vex.Flow.Barline.type.REPEAT_END);

  return vf;
}

// Create a sheet of Bach's Minuet in G.
// Copied from one of VexFlow's tests.
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
