import WebMidi from 'webmidi';
import $ from 'jquery';

const G = {
  midi: {
    input: null,
    output: null
  }
};

function playNote(notes, index) {
  if (index >= notes.length) return;

  const note = notes[index];
  G.midi.output.playNote(note.name);
  setTimeout(() => {
    G.midi.output.stopNote(note.name);
    playNote(notes, index+1);
  }, note.duration);
}

function playSequence(notes) {
  playNote(notes, 0);
}

WebMidi.enable(function (err) {
    console.log(WebMidi.inputs);
    console.log(WebMidi.outputs);
    G.midi.output = WebMidi.getOutputByName('Synth input port (3310:0)');
    $('#midi').html(G.midi.output.name);

    playSequence([
      { name: "C3", duration: 500 },
      { name: "D3", duration: 500 },
      { name: "Eb3", duration: 500 },
      { name: "F3", duration: 500 },
      { name: "G3", duration: 500 },
      { name: "Ab3", duration: 500 },
      { name: "B3", duration: 500 },
      { name: "C4", duration: 500 },
    ]);
});
