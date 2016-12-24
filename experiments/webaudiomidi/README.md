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
- `qsynth` assuming a functional existing setup of Qsynth
- `timidity -iA` assuming a functional existing setup of TiMiditi++
- `aconnect -o` should show available output ports, including `FLUID Synth` and `TiMidity`
- Open `./index.html`
- Select the output MIDI port as per above, and the MIDI channel (1-16, or `all`)
- Play!

## Experiment: using MIDI Through Ports to route output to softsynth
Routing the MIDI output of the sheet player to a softsynth such as http://mmontag.github.io/dx7-synth-js/.
The `MIDI Through Port` ports appear both as input and output, and indeed they show up
both on the sheet player's output MIDI ports, and on the DX7 emulator's input ports.

- Open `./index.html`
- Select `MIDI Through Port-0` as output
- Open http://mmontag.github.io/dx7-synth-js/ in another tab
- Select `MIDI Through Port-0` as MIDI Device (this is the synth's input)
- Play!
- Change instruments on the DX7
- Play again!

Note that if you switch tabs to a one different from the sheet player, the music will slow down.
Currently [investigating this issue](https://github.com/chrisguttandin/worker-timers/issues/65).

## Various notes
- To increase the number of available MIDI Through Ports, edit `/etc/modprobe.conf/alsa-base.conf` to add the following line:
```
options snd-seq-dummy ports=4
```
- Virtual MIDI Ports (provided by kernel module `snd-virmidi`) are NOT used for general routing of MIDI messages! cf. http://music.stackexchange.com/questions/51463/how-to-use-snd-virmidi-on-linux
