#!/usr/bin/python
import sys
from music21 import *

mf = midi.MidiFile()
mf.open(sys.argv[1])
mf.read()
s = midi.translate.midiFileToStream(mf)
for n in s.flat.notes:
  for p in n.pitches:
    p.midi = 129 - p.midi
mo = midi.translate.streamToMidiFile(s)
mo.open(sys.argv[2], 'wb')
mo.write()
mo.close()
