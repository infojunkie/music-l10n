import WebMidi from 'webmidi';
import $ from 'jquery';

const G = {
  midi: {
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
    WebMidi.outputs.forEach((output) => {
      $('#midi #outputs').append($('<option>', { value: output.id, text: output.name }));
    });
    $('#midi #play').on('click', () => {
      const id = $('#midi #outputs').val();
      console.log(id);
      G.midi.output = WebMidi.getOutputById(id);
      playSequence([
        { name: "C3 Eb3 G3", duration: 500 },
        { name: "D3 F3 Ab3", duration: 500 },
        { name: "Eb3 G3 B3", duration: 500 },
        { name: "F3 Ab3 C4", duration: 500 },
        { name: "G3 B3 D4", duration: 500 },
        { name: "Ab3 C4 Eb4", duration: 500 },
        { name: "B3 D4 F4", duration: 500 },
        { name: "C4 Eb4 G4", duration: 500 },
      ]);
    });
});
