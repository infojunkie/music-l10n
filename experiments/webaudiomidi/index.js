import WebMidi from 'webmidi';
import $ from 'jquery';
import store from 'store';
import Vex from 'vexflow';
import * as Timer from 'worker-timers';

let G = {
  midi: {
    output: null,
    config: {
      output: null,
      channel: 0
    }
  },
  notes: [
    { name: "C4", duration: 500 },
    { name: "D4", duration: 500 },
    { name: "Eb4", duration: 500 },
    { name: "F4", duration: 500 },
    { name: "G4", duration: 500 },
    { name: "Ab4", duration: 500 },
    { name: "B4", duration: 500 },
    { name: "C5", duration: 500 },
  ]
};

function play(notes) {
  function playNote(notes, index) {
    if (index >= notes.length) return;

    const note = notes[index];
    G.midi.output.playNote(note.name, G.midi.config.channel);
    Timer.setTimeout(() => {
      G.midi.output.stopNote(note.name);
      playNote(notes, index+1);
    }, note.duration);
  }

  playNote(notes, 0);
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
    G.midi.config = store.get('G.midi.config') || G.midi.config;
    WebMidi.outputs.forEach((output) => {
      $('#midi #outputs').append($('<option>', { value: output.id, text: output.name }));
    });
    $('#midi #outputs').val(G.midi.config.output);
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
      play(G.notes);
    });
    render(G.notes);
});

var time = performance.now();
Timer.setInterval(() => {
  console.log(performance.now() - time);
  time = performance.now();
}, 500);
