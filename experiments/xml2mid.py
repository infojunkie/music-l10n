#!/usr/bin/python
import sys
import music21
c = music21.converter.parse(sys.argv[1])
mf = music21.midi.translate.streamToMidiFile(c)
mf.open(sys.argv[1].replace('.xml', '.mid'), 'wb')
mf.write()
mf.close()
