# music-l10n
Music localization

Localizing music involves retrofitting existing music software (and writing new ones) with the ability to represent and process musical systems from around the world, not just (standard 12-TET) Western Music.

The ultimate goal is to become the [CLDR](http://cldr.unicode.org/) of music.

## Architecture

The current thinking is to create a client-server software system where the server performs the musicological functions, and returns the resulting music data to a client that renders it in a player.

World musical systems/cultures exhibit specificities at many levels: tunings, notes, scales, rhythms, ornaments, etc. - both in naming and in the logic of music expression itself. The idea is to represent these objects them in a common logical music model that allows for cross-matching and manipulation.

Some examples can help:
- Play the same piece in different tunings, e.g. Just vs 12-EDO (and possibly extend this beyond 12 tones per octave)
- Get the possible names of a scale with notes "D Eb F# G A Bb C", as "D Phrygian dominant" (Western music system) and "D Hijaz descending" (Arabic music system).
- Inject a "swing 16th" rhythm or a "maqsum" rhythm into a piece - by modifying the note durations based on the rhythm definition.

We'll use [music21](https://github.com/cuthbertLab/music21) as the framework to build this functionality. It is a mature musicology system that contains most needed abstractions and is built with the Web in mind, especially through its [music21j](https://github.com/cuthbertLab/music21j) counterpart. *music21j* utilizes [VexFlow](https://github.com/0xfe/vexflow) for client-side engraving and [MIDI.js](https://github.com/mudcube/MIDI.js) for sound playing, both excellent libraries.  

To facilitate musicological experimentation, we'll use [Jupyter](http://jupyter.org/) notebooks, which are already supported by *music21*. 

We'll also use the [Musical MIDI Accompaniment (MMA)](http://www.mellowood.ca/mma/) system, which provides a flexible model for MIDI generation, featuring rhythmic and harmonic functions. 
