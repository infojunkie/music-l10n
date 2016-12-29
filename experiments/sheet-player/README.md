# Sheet MIDI

## Wat
A sheet music navigator, player, and "editor".

Navigator means we can organize and query sheets. Anything from a C harmonic minor scale to a jazz standard or a Bach minuet.

Player means we generate a stream of MIDI events corresponding to the sheet's sequence.

"Editor" means we can create new sheets, e.g.:
- by importing from MIDI files, MusicXML files, etc.,
- by entering notes and scores in a textual format,
- by applying functions to existing sheets or parts thereof (e.g. `add6thBelowEachNote` or `transposeUpA3rd`)

## MIDI setup
- Install [Jazz-Plugin](http://jazz-soft.net/download/Jazz-Plugin/) for Web MIDI API on Firefox
- `sudo modprobe snd-virmid` to enable Virtual MIDI ports (needed by Jazz-Plugin)
- `qsynth` assuming a functional existing setup of Qsynth
- `timidity -iAD` assuming a functional existing setup of TiMiditi++
- `aconnect -o` should show available output ports, including `FLUID Synth` and `TiMidity`
- `aconnect 24:0 130:0` where `24:0` should be the port of `VirMIDI 2-0` and `130:0` should be the port of `TiMidity port 0` - this will wire up Jazz-Plugin
- Open `./index.html`
- Select the out  put MIDI port as per above, and the MIDI channel (1-16, or `all`)
- Play!

## VexFlow to MIDI
Since VexFlow contains a full specification of the performance, it can be parsed to generate MIDI events. This is what the function [`playVF`](https://github.com/infojunkie/music-l10n/blob/master/experiments/sheet-player/index.js#L63) does. This is a very tricky function to write because each part of the VexFlow model can potentially affect MIDI playback. For example:

- Key signature
- Grace notes
- Dynamics
- Repeats and voltas
- Ties
etc.

## Microtonal support
To support microtonal music during MIDI playback, two approaches can be used:

- Using [MIDI Pitch Bend messages](http://sites.uci.edu/camp2014/2014/04/30/managing-midi-pitchbend-messages/). Pitch bend affects a full MIDI channel, so all notes that are playing while the bend is in effect will be affected. Also, because this message is separate from the Note On and Note Off messages, one can hear sound fluctuations at note boundaries. This approach is currently implemented.

- Using [MIDI Tuning system message](http://www.microtonal-synthesis.com/MIDItuning.html). It should be possible to send a tuning specification for each MIDI note ahead of time, but not all MIDI synths support this feature. Still, it should be implemented here because it's more robust than pitch bends.

## MIDI playback issues
The Web MIDI API allows to schedule MIDI events "in advance", i.e. by allowing for each event a future timestamp or time difference to wait for before sending the event to the specified port. This is useful because browser tabs that are unfocused throttle the `setTimeout` family of functions, which makes real-time scheduling of events unreliable. [Timers based on Web Workers](https://github.com/chrisguttandin/worker-timers) should solve this but [I haven't been able to make them work](https://github.com/chrisguttandin/worker-timers/issues/65).

HOWEVER! What happens when the user wants to stop playback before the song is over? The Web MIDI API specifies a `Output.clear()` method which should clear this queue of future MIDI events, but [Chrome does not implement it yet](https://bugs.chromium.org/p/chromium/issues/detail?id=471798). I still haven't found a workaround for that.

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

## Various notes
- To increase the number of available MIDI Through Ports, edit `/etc/modprobe.conf/alsa-base.conf` to add the following line:
```
options snd-seq-dummy ports=4
```
- Virtual MIDI Ports (provided by kernel module `snd-virmidi`) are NOT used for general routing of MIDI messages! cf. http://music.stackexchange.com/questions/51463/how-to-use-snd-virmidi-on-linux
- Jazz-Plugin on Firefox seems to return ONLY Virtual MIDI Ports, NOT the full list of ALSA MIDI ports. Investigating: http://jazz-soft.org/bb/viewtopic.php?f=2&t=934
