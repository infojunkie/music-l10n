import WebMidi from 'webmidi';
import $ from 'jquery';
import store from 'store';
import Vex from 'vexflow';
import sheets from './sheets.json';
import tonal from 'tonal';

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

function play(notes) {
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

  vf.draw();
}

WebMidi.enable(function (err) {
  G.midi.config = Object.assign({}, G.midi.config, store.get('G.midi.config'));

  // MIDI Output
  WebMidi.outputs.forEach((output) => {
    $('#midi #outputs').append($('<option>', { value: output.id, text: output.name }));
  });
  $('#midi #outputs').val(G.midi.config.output);

  // MIDI Channl
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
