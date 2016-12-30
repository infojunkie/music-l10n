import WebMidi from 'webmidi';
import $ from 'jquery';
import store from 'store';
import Vex from 'vexflow';
import sheets from './sheets.json';
import tonal from 'tonal';

function concat(a, b) { return a.concat(b); }

let G = {
  midi: {
    output: null,
    time: 1,
    config: {
      output: null,
      channel: 0,
      sheet: 0
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

const PB_QUARTER_TONE = 0.25;
const PB_COMMA = 1/9;

function pitchBend(note) {
  // Parse Vexflow note pattern
  // https://github.com/0xfe/vexflow/wiki/Microtonal-Support
  let score = new Vex.Flow.EasyScore();
  let adjustedNote = note.name;
  if (score.parse(note.name).success) {
    const acc = ORNULL(score.builder.piece.chord[0].accid);
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
    const pb = ORNULL(acc_to_pb[acc]);
    if (pb) {
      G.midi.output.sendPitchBend(pb, G.midi.config.channel, { time: `+${G.midi.time}` });
      let endTime = G.midi.time + note.duration;
      G.midi.output.sendPitchBend(0, G.midi.config.channel, { time: `+${endTime}` });
      adjustedNote = score.builder.piece.chord[0].key + score.builder.piece.chord[0].octave;
    }
  }
  return adjustedNote;
}

function ticksToMilliseconds(bpm, resolution) {
  return 60000.00 / (bpm * resolution);
}

function playVF(vf) {
  console.log(vf);
  G.midi.time = 1;
  let timeNextMeasure = 0;
  let ticksToTime = ticksToMilliseconds(66/3, Vex.Flow.RESOLUTION);
  vf.systems.forEach((system) => {
    system.parts.forEach((part) => {
      part.voices.forEach((voice) => {
        let time = G.midi.time;
        voice.tickables.filter((t) => t.keyProps).forEach((tickable) => {
          let duration = Math.round(tickable.ticks.numerator * ticksToTime / tickable.ticks.denominator);
          tickable.keyProps.forEach((note) => {
            G.midi.output.playNote(note.key+note.octave, G.midi.config.channel, {
              time: `+${time}`,
              duration: duration
            });
          });
          time += duration;
          timeNextMeasure = Math.max(time, timeNextMeasure);
        });
      });
    });
    G.midi.time = timeNextMeasure;
  });
}

function play(notes) {
  if (!Array.isArray(notes)) {
    playVF(notes());
    return;
  }

  G.midi.time = 1;
  notes.forEach((note) => {
    let name = pitchBend(note);
    G.midi.output.playNote(name, G.midi.config.channel, {
      time: `+${G.midi.time}`,
      duration: note.duration
    });
    G.midi.time += note.duration;
  });
}

function render(notes) {
  if (Array.isArray(notes)) {
    var vf = new Vex.Flow.Factory({
      renderer: {selector: 'vexflow', width: 500, height: 200}
    });

    var score = vf.EasyScore();
    var system = vf.System();
    var vf_notes = notes.map((n) => n.name).join(', ');
    var voice = score.voice(score.notes(vf_notes));
    voice.setMode(Vex.Flow.Voice.Mode.SOFT);

    system.addStave({
      voices: [
        voice
      ]
    }).addClef('treble');
  }
  else {
    vf = notes();
  }

  vf.draw();
}

WebMidi.enable(function (err) {
  G.midi.config = Object.assign({}, G.midi.config, store.get('G.midi.config'));

  // MIDI Output
  WebMidi.outputs.forEach((output) => {
    $('#midi #outputs').append($('<option>', { value: output.id, text: output.name }));
  });
  $('#midi #outputs').val(G.midi.config.output);

  // MIDI Channel
  // [1..16] as per http://stackoverflow.com/a/33352604/209184
  Array.from(Array(16)).map((e,i)=>i+1).concat(['all']).forEach((channel) => {
    $('#midi #channels').append($('<option>', { value: channel, text: channel }));
  });
  $('#midi #channels').val(G.midi.config.channel);
  $('#midi #play').on('click', () => {
    G.midi.config.output = $('#midi #outputs').val();
    G.midi.config.channel = $('#midi #channels').val();
    G.midi.output = WebMidi.getOutputById(G.midi.config.output);
    store.set('G.midi.config', G.midi.config);
    play(G.sheets[G.midi.config.sheet].notes);
  });
  $('#midi #stop').on('click', () => {
    // https://github.com/WebAudio/web-midi-api/issues/102
    // https://bugs.chromium.org/p/chromium/issues/detail?id=471798
    ORNULL(G.midi.output._midiOutput.clear());
    G.midi.output.sendChannelMode('allsoundoff', 0, G.midi.config.channel);
  });

  // Sheet
  G.sheets.push({
    name: 'C Lydian',
    notes: tonal.scale('C lydian').map(function(n) { return { name: `${n}4`, duration: 500} })
  });
  G.sheets.push({
    name: 'Bach Minuet in G',
    notes: () => bach()
  });
  G.sheets.forEach((sheet, index) => {
    $('#sheets').append($('<option>', { value: index, text: sheet.name }));
  });
  $('#sheets').val(G.midi.config.sheet).on('change', () => {
    G.midi.config.sheet = $('#sheets').val();
    $('#vexflow').empty();
    render(G.sheets[G.midi.config.sheet].notes);
  });

  render(G.sheets[G.midi.config.sheet].notes);
});

function bach() {
  var registry = new Vex.Flow.Registry();
  Vex.Flow.Registry.enableDefaultRegistry(registry);
  var vf = new Vex.Flow.Factory({
    renderer: {selector: 'vexflow', width: 1100, height: 900}
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
