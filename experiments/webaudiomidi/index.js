import WebMidi from 'webmidi';
import $ from 'jquery';
import store from 'store';
import Vex from 'vexflow';
import sheets from './sheets.json';

let G = {
  midi: {
    output: null,
    config: {
      output: null,
      channel: 0,
      sheet: 0
    }
  },
  sheets: sheets.data
};

function play(notes) {
  let time = 1;
  notes.forEach((note) => {
    G.midi.output.playNote(note.name, G.midi.config.channel, {
      time: `+${time}`,
      duration: note.duration
    });
    time += note.duration;
  });
}

function render(notes) {
  var vf = new Vex.Flow.Factory({
    renderer: {selector: 'vexflow', width: 500, height: 200}
  });

  var score = vf.EasyScore();
  var system = vf.System();

  var vf_notes = notes.map((n) => n.name).join(', ');

  system.addStave({
    voices: [
      score.voice(score.notes(vf_notes)),
    ]
  }).addClef('treble').addTimeSignature('4/4');

  vf.draw();
}

WebMidi.enable(function (err) {
  G.midi.config = Object.assign({}, G.midi.config, store.get('G.midi.config'));

  // MIDI Output
  WebMidi.outputs.forEach((output) => {
    $('#midi #outputs').append($('<option>', { value: output.id, text: output.name }));
  });
  $('#midi #outputs').val(G.midi.config.output);

  // MI]]`DI Channl
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

  // Sheet
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
