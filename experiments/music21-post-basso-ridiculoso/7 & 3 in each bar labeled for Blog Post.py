from music21 import *
import os 

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

################  Alteration Functions
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
        MyScore.metadata.Copyright = 'All Rights 2016'
## END ALTERATION FUNCTIONS


myFilePath = "/../../../Volumes/TerraDrive/IREALB/" ##change to any local directory path

src = converter.parseFile(os.path.join(myFilePath, "Alone Together.xml")) #change file name as needed


s = src.parts[0].getElementsByClass("Measure")
harmony.realizeChordSymbolDurations(s) ## Needed to make this work!
MyScore = stream.Stream()
DoMyMeta()
MyClef = clef.BassClef() #define bass clef, change as needed
MyScore.append(s[0].keySignature) ## get key from document
MyScore.append(MyClef) #add clef

for m in s:
    MyMeasure = stream.Measure() ## Make a measure and put everything inside it
    MyMeasure.number = m.number  ## give the measure a number
    MyMeasure.rightBarline = m.rightBarline
    MyMeasure.leftBarline = m.leftBarline
    print("_____________________")
    print("In measure "+ str(m.number)+" of " + str(len(s)) ) #debug monitoring
    c = m.getElementsByClass(harmony.ChordSymbol) 
    for x in range(len(c)):
            print(c[x].duration)
            print(c[x].beat)
            print (c[x].figure)
            print("--------------------")
            TheFigure = c[x].figure
            MyChord = chord.Chord(c[x].pitches)
            MySymbol =  harmony.ChordSymbol()
            ######## Fix XML chord symbols ############
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
                    if (c[x].root().name != c[x].bass().name):
                         print (c[x].root().name, c[x].bass().name)
                         MySymbol =  harmony.ChordSymbol(root=c[x].root(), bass=c[x].bass(), kind=c[x].chordKind)
                    else:
                        MySymbol =  harmony.ChordSymbol(root=c[x].root(), bass=c[x].root(), kind=c[x].chordKind)
                    MySymbol.duration = c[x].duration
                    MyMeasure.append(MySymbol)
                    print("Wrote chord " + str(MySymbol.figure) + "...")
            n3 = note.Note(MySymbol.third)
            n3.duration = duration.Duration(c[x].duration.quarterLength * 0.50)
            n3.lyric = Third
            MyMeasure.append(n3)
            if (MySymbol.containsSeventh()):
                n7 = note.Note(MySymbol.seventh)
                n7.duration =  duration.Duration(c[x].duration.quarterLength * 0.50)
                n7.lyric = Seventh
                MyMeasure.append(n7)
            else:
                n5 = note.Note(MySymbol.root())
                n5.duration =  duration.Duration(c[x].duration.quarterLength * 0.50)
                n5.lyric = "R"
                MyMeasure.append(n5)   
            if ((m.number)%4 == 0):
                sl = layout.SystemLayout(isNew=True)
                MyMeasure.append(sl)
    MyScore.append(MyMeasure)

DoMyMeta() ## write copyright and author info
MyScore.show('oldmusicxml')
