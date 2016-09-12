from music21 import *


print("Starting Parse...")
src = corpus.parse('myLeadSheets/Freddie Freeloader Solo - Finaled v1.xml')
## Create a folder in the Music21 Corpus folder and store any files you want to analyze within.
print("Parse Done...")

dur1 = duration.Duration('whole')
dur2 = duration.Duration('half')
dur4 = duration.Duration('quarter')
dur8 = duration.Duration('eighth')
dur16 = duration.Duration('16th')
Seventh = "7th"
Third = "3rd"
Root = "R"
Fifth = "5th"
Ninth = "9th"
Sixth = "6th"
Eleventh = "11"

#These functions recognize some jazz chords as exported from IRealB

def WriteFlatNine(RootNote, Duration, Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind=Kind)
        print(MySymbol)
        MySymbol.duration = Duration
        hd = harmony.ChordStepModification()
        hd.type = 'add'
        hd.interval = -1
        hd.degree = 2
        MySymbol.addChordStepModification(hd)
        MyMeasure.append(MySymbol)
        return(MySymbol)
        
def WriteSharpNine(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind=Kind)
        print(MySymbol)
        MySymbol.duration = Duration
        hd = harmony.ChordStepModification()
        hd.type = 'add'
        hd.interval = 1
        hd.degree = 2
        MySymbol.addChordStepModification(hd)
        MyMeasure.append(MySymbol)
        return(MySymbol)
        
def WriteSharpSeven(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind=Kind)
        print(MySymbol)
        MySymbol.duration = Duration
        hd = harmony.ChordStepModification()
        hd.type = 'add'
        hd.interval = 1
        hd.degree = 7
        MySymbol.addChordStepModification(hd)
        MyMeasure.append(MySymbol)
        return(MySymbol)
        
def WriteSharpEleven(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind=Kind)
        print(MySymbol)
        MySymbol.duration = Duration
        hd = harmony.ChordStepModification()
        hd.type = 'add'
        hd.interval = 1
        hd.degree = 11
        MySymbol.addChordStepModification(hd)
        MyMeasure.append(MySymbol)
        return(MySymbol)

def WriteFlatThirteen(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind=Kind)
        print(MySymbol)
        MySymbol.duration = Duration
        hd = harmony.ChordStepModification()
        hd.type = 'add'
        hd.interval = -1
        hd.degree = 13
        MySymbol.addChordStepModification(hd)
        MyMeasure.append(MySymbol)
        return(MySymbol)

def WriteFlatSix(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind=Kind)
        print(MySymbol)
        MySymbol.duration = Duration
        hd = harmony.ChordStepModification()
        hd.type = 'alter'
        hd.interval = -1
        hd.degree = 13
        MySymbol.addChordStepModification(hd)
        MyMeasure.append(MySymbol)
        return(MySymbol)
           
def WriteHalfDim(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind='half-diminished')
        MySymbol.duration = Duration
        MyMeasure.append(MySymbol)
        print("Wrote chord " + str(MySymbol.figure) + "...")
        return(MySymbol)
        
def WritePedal(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind='major')
        MySymbol.duration = Duration
        MyMeasure.append(MySymbol)
        print("Transformed Pedal Chord to " + str(MySymbol.figure) + "...")
        return(MySymbol)
           
def WriteSharpFive(RootNote, Duration,Kind):
        MySymbol =  harmony.ChordSymbol(root=RootNote, bass=RootNote, kind=Kind)
        print(MySymbol)
        MySymbol.duration = Duration
        hd = harmony.ChordStepModification()
        hd.type = 'alter'
        hd.interval = 1
        hd.degree = 5
        MySymbol.addChordStepModification(hd)
        MyMeasure.append(MySymbol)
        return(MySymbol)

def DoMyMeta():
        w = src.metadata
        MyScore.metadata = metadata.Metadata()
        
   #      TheDate = datetime.now()
#         Timestamp = str( str(TheDate.month)+ "-" + str(TheDate.day) + "-" + str(TheDate.hour) + "-" + str(TheDate.second))
        # TitleString = str('Line Breaks' + '\n' + Timestamp)
        MyScore.metadata.movementName = str("Guide Tones for \'" + w.movementName + "\'")
        MyScore.metadata.composer = 'Basso Ridiculoso using Music21' + "\n" + "bassoridiculoso.blogspot.com"
        MyScore.metadata.Copyright = 'All Rights 2013'

#contains the labels for the relationship of notes against the chord. Adapt to preference.
MyIntervalLabels = {
            "P8" : "R",
            "P1" : "R",
            "d1" : "7",
            "d8" : "7",
            "A8" : "b9",
            "A1" : "b9",
            "m2" : "b9",
            "M2" : "9",
             "d2" : "X",
             "A2" : "#9",
             "d3" : "9",
             "m3" : "b3",
            "M3" : "3",
             "A3" : "11",
            "d4" : "3",
            "P4" : "11",
            "A4" : "#11",
            "AA4" : "5",
            "dd5" : "11",
            "d5" : "b5",
            "d6" : "5",
            "P5" : "5",
            "A5" : "#5",
            "m6" : "b13",
            "M6" : "13",
            "A6" : "b7",
            "d7" : "13",
            "m7" : "b7",
            "M7" : "7",
            "A7" : "R"
            }

MyScore = stream.Score() ## create a stream to put everything in
print("Made Stream...")
s = src.parts[0].getElementsByClass("Measure") ## get the measures
harmony.realizeChordSymbolDurations(s) ## need this to see how long chords are

MyClef = clef.BassClef() #for bass players!
MyScore.append(s[0].keySignature) ## get key from document
MyScore.append(MyClef)

for m in s:
    MyMeasure = stream.Measure() ## Make a measure and put everything inside it
    MyMeasure.number = m.number  ## give the measure a number
    MyMeasure.rightBarline = m.rightBarline
    MyMeasure.leftBarline = m.leftBarline
    print("_____________________") ## debug activity monitor
    print("In measure "+ str(m.number)+" of " + str(len(s)) ) ## debug activity monitor
    c =m.getElementsByClass(harmony.ChordSymbol) ## Get all chord symbols in this measure
    TheNotes = m.flat.notesAndRests ## Get all the notes and rests in this measuer
    for x in range(len(c)):
           TheFigure = c[x].figure
           MyChord = chord.Chord(c[x].pitches)
           MySymbol =  harmony.ChordSymbol()
           if (TheFigure.find(" alter b9") != -1):
               MySymbol = WriteFlatNine(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" add b9") != -1):
             MySymbol =   WriteFlatNine(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" add #9") != -1):
              MySymbol =  WriteSharpNine(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" add #7") != -1):
              MySymbol =  WriteSharpSeven(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" add #11") != -1):
              MySymbol =  WriteSharpEleven(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" add b13") != -1):
              MySymbol =  WriteFlatThirteen(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" add b6") != -1):
              MySymbol =  WriteFlatSix(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" alter b5") != -1):
               MySymbol = WriteHalfDim(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find(" alter #5") != -1):
              MySymbol =  WriteSharpFive(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           elif (TheFigure.find("pedal") != -1):   
              MySymbol = WritePedal(c[x].pitches[0].name,c[x].duration,c[x].chordKind)
           else:
            if (c[x].duration.type != "zero"):
                    MyChord = chord.Chord(c[x].pitches)
                    MyChord[0].octave = 0
                    MySymbol = harmony.chordSymbolFromChord(MyChord)
                    MySymbol.duration = c[x].duration
                    MyMeasure.append(MySymbol)
                    print("Wrote chord " + str(MySymbol.figure) +  "..." + str(MySymbol.duration))
          ## End of Chord Symbol Processing ## 
           OffsetNotes = TheNotes.flat.getElementsByOffset(c[x].offset, (c[x].offset)+(c[x].duration.quarterLength), includeEndBoundary=False , mustBeginInSpan=True, classList=['Note','Rest'])
           for p in OffsetNotes:
            if p.isNote:
               aInterval = interval.notesToInterval(c[x].pitches[0], p.pitch) #determine which interval it is
               p.lyric = MyIntervalLabels[aInterval.semiSimpleName] #write the label into the lyric for that note
               MyMeasure.append(p)
            else:
               MyMeasure.append(p)
    MyScore.append(MyMeasure)
    
    
print("Writing out XML...")
MyScore.show('oldmusicxml')
print("DONE!")