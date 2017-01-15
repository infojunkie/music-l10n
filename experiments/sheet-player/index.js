import WebMidi, { Output } from 'webmidi';
import $ from 'jquery';
import store from 'store';
import Vex from 'vexflow';
import sheets from './sheets.json';
import tonal from 'tonal';
import Soundfont from 'soundfont-player';
import NoteParser from 'note-parser';

function concat(a, b) { return a.concat(b); }

const MIDI_START_TIME = 1;

let G = {
  midi: {
    output: null,
    time: MIDI_START_TIME,
    marker: null,
    bpm: 60,
    config: {
      output: null,
      channel: 0,
      sheet: 0,
      sync: 100, // the play marker is assumed to be 100 ms ahead of MIDI playback
      marker_mode: 'measure',
    }
  },
  sheets: sheets.data
};

DEFINE_MACRO(ORNULL, (expr) => {
  try {
    return expr;
  }
  catch (e) {
    return null;
  }
});

class LocalMidiOutput {
  constructor() {
    this.pb = 0;
  }
  playNote(noteName, channel, options) {
    const time = G.midi.ac.currentTime + eval(options.time) * 0.001;
    const duration = options.duration * 0.001;
    if (this.pb) {
      noteName = NoteParser.midi(noteName);
      noteName += (this.pb*2); // Local player counts microtones in fractions of semitones
    }
    G.midi.local.play(noteName, time, { duration });
  }
  sendPitchBend(pb, channel, options) {
    this.pb = pb;
  }
  stop() {
    G.midi.local.stop();
  }
};

Vex.Flow.Factory.prototype.drawWithoutReset = function() {
  this.systems.forEach(i => i.setContext(this.context).format());
  this.staves.forEach(i => i.setContext(this.context).draw());
  this.voices.forEach(i => i.setContext(this.context).draw());
  this.renderQ.forEach(i => {
    if (!i.isRendered()) i.setContext(this.context).draw();
  });
  this.systems.forEach(i => i.setContext(this.context).draw());
}

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

const PB_QUARTER_TONE = 0.25;
const PB_COMMA = 1/9;

function playNote(note, accidental, time, duration) {
  const acc_to_pb = {
    '+': PB_QUARTER_TONE,
    '++': PB_QUARTER_TONE * 3,
    'bs': -PB_QUARTER_TONE,
    'd': -PB_QUARTER_TONE,
    'db': -PB_QUARTER_TONE * 3,
    '+-': PB_COMMA * 5,
    '++-': PB_COMMA * 8,
    'bss': -PB_COMMA * 8
  };
  const pb = ORNULL(acc_to_pb[accidental]);
  if (pb) {
    accidental = '';
    G.midi.output.sendPitchBend(pb, G.midi.config.channel, { time: `+${time}` });
  }

  G.midi.output.playNote(note.key+(accidental||'')+note.octave, G.midi.config.channel, {
    time: `+${time}`,
    duration: duration
  });

  if (pb) {
    let endTime = time + duration;
    G.midi.output.sendPitchBend(0, G.midi.config.channel, { time: `+${endTime}` });
  }
}

function playVF(vf) {
  G.midi.time = MIDI_START_TIME;
  G.midi.timers = [];
  let keyAccidentals = null;

  // Timing information that will be calculated inside.
  let time = {
    start: 0,
    duration: 0,
    ticksToTime: 60000 / (60 * Vex.Flow.RESOLUTION / 4),
  };

  // A system is a full measure.
  vf.systems.forEach((system) => {

    // Used to display play marker.
    const ctx = system.checkContext();
    const y1 = system.options.y;
    const y2 = system.lastY;

    // A system's formatter has an ordered list of all tick events, grouped in "tick contexts".
    system.formatter.tickContexts.list.forEach((tickStart) => {
      const tickContext = system.formatter.tickContexts.map[tickStart];

      let x1 = Number.MAX_SAFE_INTEGER;
      let x2 = 0;

      // Iterate on notes.
      tickContext.tickables.forEach((tickable) => {
        let accidental = null;
        if (tickable instanceof Vex.Flow.StaveNote) {

          // Parse stave modifiers for key signature, time signature, etc.
          tickable.stave.modifiers.forEach((modifier) => {
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
          });

          // Compute time.
          time.start = G.midi.time + Math.round(tickStart * time.ticksToTime);
          time.duration = Math.round(tickable.ticks.numerator * time.ticksToTime / tickable.ticks.denominator);

          // Parse note modifiers.
          tickable.modifiers.forEach((modifier) => {
            if (modifier instanceof Vex.Flow.Accidental) {
              accidental = modifier.type; // TODO: which note does this accidental affect?
            }
          });

          // Compute play marker position.
          if (G.midi.config.marker_mode == 'note') {
            const metrics = tickable.getMetrics();
            const xStart = tickable.getAbsoluteX() - metrics.modLeftPx - metrics.extraLeftPx;
            const xEnd = tickable.getAbsoluteX()
              + metrics.noteWidth
              + metrics.extraRightPx
              + metrics.modRightPx;
            x1 = Math.min(x1, xStart);
            x2 = Math.max(x2, xEnd);
          }
          else {
            x1 = system.startX;
            x2 = system.startX + system.formatter.justifyWidth;
          }

          // Output to MIDI.
          tickable.keyProps.forEach((note) => {
            playNote(note, accidental ? accidental : ORNULL(keyAccidentals[note.key]), time.start, time.duration);
          });
        }
      });

      // Draw play marker.
      G.midi.timers.push(setTimeout(() => {
        if (G.midi.marker) ctx.svg.removeChild(G.midi.marker);
        ctx.beginPath();
        ctx.setStrokeStyle('#aaa');
        ctx.setFillStyle('#aaa');
        ctx.setLineWidth(1);
        ctx.attributes.opacity = 0.2;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        G.midi.marker = ctx.svg.lastChild;
      }, time.start + G.midi.config.sync));
    });

    // Advance time by measure's total ticks.
    // The conversion factor was computed separately by each tickable due to the VexFlow format.
    G.midi.time += Math.round(system.formatter.totalTicks.numerator * time.ticksToTime / system.formatter.totalTicks.denominator);
  });
}

function play() {
  playVF(G.vf);
}

const CANVAS_WIDTH=500;
const CANVAS_HEIGHT=200;

function renderVF(notes) {
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

function render(notes) {
  var vf;
  if (Array.isArray(notes)) {
    vf = renderVF(notes);
  }
  else {
    vf = notes();
  }

  vf.drawWithoutReset();
  G.vf = vf;
  console.log(G.vf);
}

WebMidi.enable(function (err) {
  G.midi.config = Object.assign({}, G.midi.config, store.get('G.midi.config'));

  // MIDI Output.
  $('#sheet #outputs').append($('<option>', { value: 'local', text: "(local synth)" }));
  WebMidi.outputs.forEach((output) => {
    $('#sheet #outputs').append($('<option>', { value: output.id, text: output.name }));
  });
  $('#sheet #outputs').val(G.midi.config.output);

  // MIDI Channel.
  // [1..16] as per http://stackoverflow.com/a/33352604/209184
  Array.from(Array(16)).map((e,i)=>i+1).concat(['all']).forEach((channel) => {
    $('#sheet #channels').append($('<option>', { value: channel, text: channel }));
  });
  $('#sheet #channels').val(G.midi.config.channel);

  // Marker mode.
  $('#sheet input[name="marker_mode"][value='+G.midi.config.marker_mode+']').attr('checked', 'checked');

  // Handle "Play" button.
  $('#sheet #play').on('click', () => {
    G.midi.config.output = $('#sheet #outputs').val();
    G.midi.config.channel = $('#sheet #channels').val();
    G.midi.config.marker_mode = $('#sheet input[name="marker_mode"]:checked').val();
    if (G.midi.config.output !== 'local') {
      G.midi.output = WebMidi.getOutputById(G.midi.config.output);
    }
    else {
      G.midi.output = new LocalMidiOutput();
    }
    store.set('G.midi.config', G.midi.config);
    play();
  });

  // Handle "Stop" button.
  $('#sheet #stop').on('click', () => {
    if (G.midi.output.stop) {
      G.midi.output.stop();
    }
    else {
      // FIXME
      // https://github.com/WebAudio/web-midi-api/issues/102
      // https://bugs.chromium.org/p/chromium/issues/detail?id=471798
    }
    // Stop player marker.
    G.midi.timers.forEach((timer) => { window.clearTimeout(timer); });
    G.midi.timers = [];
  });

  // Build sheets.
  G.sheets.push({
    name: 'C Lydian',
    notes: tonal.scale('C lydian').map((n) => `${n}4`).concat(['c5'])
  });
  G.sheets.unshift({
    name: 'Bach Minuet in G',
    notes: () => bach()
  });
  G.sheets.forEach((sheet, index) => {
    $('#sheets').append($('<option>', { value: index, text: sheet.name }));
  });
  $('#sheets').val(G.midi.config.sheet).on('change', () => {
    G.midi.config.sheet = $('#sheets').val();
    G.midi.marker = null;
    $('#sheet-vexflow').empty();
    render(G.sheets[G.midi.config.sheet].notes);
  });

  // Load local soundfont.
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  G.midi.ac = new AudioContext();
  Soundfont.instrument(G.midi.ac, 'acoustic_grand_piano').then(function (piano) {
    G.midi.local = piano;
  });

  // Render first sheet.
  render(G.sheets[G.midi.config.sheet].notes);
});

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
