#!/usr/bin/python
from midiutil.MidiFile import MIDIFile, frequencyTransform
MyMIDI = MIDIFile(1)
tuning = [(63, 320.24370022528126), (70, 479.82340237271336)]

print(320.24370022528126, frequencyTransform(320.24370022528126))
print(479.82340237271336, frequencyTransform(479.82340237271336))
print(362.93866150753314, frequencyTransform(362.93866150753314))

MyMIDI.changeNoteTuning(0, tuning)
MyMIDI.addNote(0, 0, 60, 0, 1, 100)
MyMIDI.addNote(0, 0, 62, 1, 1, 100)
MyMIDI.addNote(0, 0, 63, 2, 1, 100)
MyMIDI.addNote(0, 0, 65, 3, 1, 100)
MyMIDI.addNote(0, 0, 67, 4, 1, 100)
MyMIDI.addNote(0, 0, 69, 5, 1, 100)
MyMIDI.addNote(0, 0, 70, 6, 1, 100)
MyMIDI.addNote(0, 0, 72, 7, 1, 100)
with open("mymidifile.mid", 'wb') as output_file:
    MyMIDI.writeFile(output_file)

