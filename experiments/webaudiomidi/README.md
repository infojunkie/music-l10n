# Sheet MIDI

## Wat
A sheet music navigator, player, and "editor".

Navigator means we can organize and query sheets. Anything from a jazz standard to a C harmonic minor scale.

Player means we generate a stream of MIDI events corresponding to the sheet's sequence.

"Editor" means we can create new sheets, e.g.:
- by importing from MIDI files, MusicXML files, etc.,
- by entering notes and scores in a textual format,
- by applying functions to existing sheets or parts thereof (e.g. `add6thBelowEachNote` or `transposeUpA3rd`)

## MIDI setup
- `qsynth` # assuming a functional existing setup of Qsynth
- `timidity -iA` # assuming a functional existing setup of TiMiditi++
- `sudo modprobe snd_virmid` # start virtual MIDI ports
- `aconnect -o` # should show available output ports, including `FLUID Synth`, `TiMidity` and `Virtual Raw MIDI`
- Open `./index.html`
- Select the output MIDI port as per above, and the MIDI channel (1-16, or `all`)
- Play!

## Experiment: using Virtual MIDI ports to route output to softsynth
Routing the MIDI output of the sheet player to a softsynth such as http://mmontag.github.io/dx7-synth-js/.
The `VirMIDI 2-x` ports appear both as input and output, and indeed they show up
both on the sheet player's output MIDI ports, and on the DX7 emulator's input ports.

But playing the sequence from the sheet player does not trigger the DX7 :-(

The [MIDI HOWTO](http://tldp.org/HOWTO/MIDI-HOWTO-10.html#ss10.3) advises to connect the first `VirMIDI` port to the second,
and then to use the first one as output for the sheet player and the second one as input to the softsynth: `aconnect 24:0 25:0`

Still, no sound :-(

Okay, let's check that we understand how Virtual MIDI ports work!
`aconnect` the first VirMIDI port to the Qsynth and/or TiMidity output ports. Then play the sheet to the virtual port.
Nothing.

`aplaymidi` a MIDI file to `--port` first VirMIDI port. Nothing.
`aplaymidi` same MIDI file to `--port` Qsynth. Music!

I don't understand how Virtual MIDI ports work :-(
