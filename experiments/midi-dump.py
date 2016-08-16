#!/usr/bin/python
import sys
from music21 import midi

mf = midi.MidiFile()
mf.open(sys.argv[1])
mf.read()
print(mf.__repr__())
