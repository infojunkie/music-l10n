# Sheet Player

## WAT?
A MIDI-enabled sheet music navigator, player, and editor packaged as a web app.

Navigator means we can organize and query sheets. Anything from a C harmonic minor scale to a jazz standard or a Bach minuet.

Player means we generate a stream of MIDI events corresponding to the sheet's sequence.

Editor means we can create new sheets, e.g.:
- by importing from MIDI files, MusicXML files, etc.,
- by entering notes and scores in a textual format,
- by applying functions to existing sheets or parts thereof (e.g. `add6thBelowEachNote` or `transposeUpA3rd`)
- by receiving input from other MIDI sources e.g. keyboard or sequencer

[CHECK OUT THE DEMO!](http://ethereum.karimratib.me:8080/)

## Getting started
- `git clone git@github.com:infojunkie/music-l10n.git && cd music-l10n/experiments/sheet-player/`
- Start a local HTTP server, e.g. `npm install -g http-server && http-server -c0`
- Open [http://localhost:8080](http://localhost:8080)
- Select the sheet called "Bach Minuet in G"
- Play!
- `npm install`
- `webpack --watch`

## MIDI / Web MIDI setup
My OS setup:
- Ubuntu 16.04 x86_64 kernel `4.4.0-59-lowlatency` GNU/Linux
- Google Chrome from repo `http://dl.google.com/linux/chrome/deb stable/main`.
- Mozilla Firefox from `http://ca.archive.ubuntu.com/ubuntu xenial-updates/main`

My MIDI setup:
- Install MIDI synth TiMidity - [Ubuntu has it](https://help.ubuntu.com/community/Midi/SoftwareSynthesisHowTo)
- `timidity -iAD` to start TiMidity in ALSA sequencer daemon mode
- `aconnect -o` should show available MIDI output ports and their client numbers, including `TiMidity` and `Midi Through`
- Firefox does not support Web MIDI natively. To add support, you need to install [Jazz-Plugin](http://jazz-soft.net/download/Jazz-Plugin/)
  - `sudo modprobe snd-virmidi` to enable Virtual MIDI ports (needed by Jazz-Plugin)
  - try `aconnect -o` again and note new `Virtual Raw MIDI` ports
  - `aconnect 24:0 130:0` where `24:0` should be the client:port of `VirMIDI 2-0` and `130:0` should be the client:port of `TiMidity port 0`
  - check that [Jazz-Plugin is able to find your MIDI ports](http://jazz-soft.net/demo/Connected.html)
- In the Sheet Player app, select the output MIDI port to be `TiMidity port 0` (or `VirMIDI 2-0` in the case of Jazz-Plugin)
- Play!

## Local sound synthesis
Basic playback is implemented using a [local synth that accepts MIDI messages](https://github.com/danigb/soundfont-player).

This library is cool because it plays [soundfonts](https://en.wikipedia.org/wiki/SoundFont), which are a format to exchange instrument samples commonly used by various MIDI synths. The sheet player comes preloaded with 3 sondfonts, the last of which, **Qanoon**, is an example of a locally-generated one.

To generate a local soundfont, you need to run `../soundfont-generator/soundfont-generator.rb` which takes a standard `.sf2` file and outputs a compatible sample structure that the library can load. Then edit `soundfonts.json` to include your soundfont in the dropdown.

## Music engraving and score definition
Sheet music display is implemented using [VexFlow](https://github.com/0xfe/vexflow).

Since VexFlow contains a full specification of the performance, it can be parsed to generate MIDI events. This is what the function `playVexFlow` does. It's a tricky function to write because each part of the VexFlow model can potentially affect MIDI playback. For example:

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
The Web MIDI API allows to schedule MIDI events "in advance", i.e. by allowing for each event a future timestamp or time difference to wait for before sending the event to the specified port. This is useful because browser tabs that are unfocused throttle the `setTimeout` family of functions, which makes real-time scheduling of events unreliable. [Timers based on Web Workers](https://github.com/chrisguttandin/worker-timers) should solve this but a [regression on Chromium breaks this functionality](https://bugs.chromium.org/p/chromium/issues/detail?id=646163) at the moment.

HOWEVER! What happens when the user wants to stop playback before the song is over? The Web MIDI API specifies a `Output.clear()` method which should clear this queue of future MIDI events, but [Chrome does not implement it yet](https://bugs.chromium.org/p/chromium/issues/detail?id=471798). I still haven't found a workaround for that.

## Experiment: using MIDI Through Ports to route output to softsynth
Routing the MIDI output of the sheet player to a softsynth such as a [Yamaha DX7 emulator](http://mmontag.github.io/dx7-synth-js/).
The `MIDI Through Port` ports appear both as input and output, and indeed they show up
both on the sheet player's output MIDI ports, and on the DX7 emulator's input ports.

- Open the Sheet Player app and select `MIDI Through Port-0` as output
- Open the Yamaha DX7 emulator in another tab and select `MIDI Through Port-0` as MIDI Device (which is the synth's input)
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
- MacOS X users can [also create virtual MIDI ports](https://www.skratchdot.com/2016/01/creating-virtual-midi-ports-on-osx/)

## TODO
- Unit tests!!
- Add options to output to Web MIDI ports in real-time instead of pre-scheduled. Ensure "Stop" button works in this mode.
- Pre-create full MIDI stream before playback. Take into account looping, grace notes, etc.
- Allow mouse selection of tickable. Playback should resume from selection.
- Create flexible selection mechanism for notes, measures, etc. Study MuseScore for inspiration.
- Read and write MusicXML files
- Read and write MIDI files
- Add "scribbles" area to attach study notes/comments to current sheet. Scribbles can be hand-input or generated (e.g. using functions such as "C Major Scale", "Add 6th to current selection")
- The main sheet and scribbles should support standard actions: play/pause, export, embed, etc.
- Use [JZZ.js](https://github.com/jazz-soft/JZZ) instead of WebMidi.js
- Playback with auto-generated accompaniment
- Refactor code, use React
- Add "Sync" widget to synchronize player marker with MIDI output (to take latency into account, kind of like [syncing audio in VLC Media Player](https://www.vlchelp.com/syncing-audio-vlc-media-player/))
- Add "Tempo" widget
- Keyboard controls, "Play/Pause" button
- Add metronome
- Add "loading..." spinner while loading soundfonts and other assets
- Support MIDI Tuning system messages
- Convert soundfonts sf* files to [JS format supported by soundfont-player](https://github.com/danigb/soundfont-player)
