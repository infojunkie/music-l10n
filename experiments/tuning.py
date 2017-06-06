#!/usr/bin/python
from midiutil.MidiFile import MIDIFile
MyMIDI = MIDIFile(1)
tuning = [(68, 440), (69, 500)]
MyMIDI.changeNoteTuning(0, tuning)
MyMIDI.addNote(0, 0, 69, 0, 1, 100)
MyMIDI.addNote(0, 0, 68, 2, 1, 100)
with open("mymidifile.mid", 'wb') as output_file:
    MyMIDI.writeFile(output_file)

