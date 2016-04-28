import Vex from 'vexflow';

const baseTable = [
    { note: "C", accidental: null },
    { note: "C", accidental: "#" },
    { note: "D", accidental: null },
    { note: "E", accidental: "b" },
    { note: "E", accidental: null },
    { note: "F", accidental: null },
    { note: "F", accidental: "#" },
    { note: "G", accidental: null },
    { note: "A", accidental: "b" },
    { note: "A", accidental: null },
    { note: "B", accidental: "b" },
    { note: "B", accidental: null },
];

/*
 * Input: an array containing numbers of semitones above middle C
 * (e.g., [0, 4, 7] for a middle C major triad).
 *
 * Output: a Vex.Flow.StaveNote.
 *
 * Optional parameter: duration, in VexFlow notation (default = "w").
 */
export function pitchesToStaveNote(pitches, duration = "w") {
    const {StaveNote, Accidental} = Vex.Flow;

    // Put the data in a more structured form.
    const keysData = pitches.map(semitones => {
        const octaveOffset = Math.floor(semitones / 12);
        const octaveName = octaveOffset + 4;

        const prePhase = semitones % 12;
        const phase = prePhase < 0 ? prePhase + 12 : prePhase;

        return {
            ...baseTable[phase],
            octave: octaveName,
        };
    });

    // Generate the key description text that VexFlow expects.
    const keys = keysData.map(keyData => {
        const {note, octave} = keyData;
        const accidental = keyData.accidental || "";
        return `${note.toLowerCase()}${accidental}/${octave}`;
    });
    const bareNote = new StaveNote({ keys, duration });

    // VexFlow makes us add accidentals in two places:
    // in the 'keys', as above (e.g., "c#/4"),
    // and additionally to the generated StaveNote.
    const noteWithAccidentals = keysData.reduce((acc, keyData, index) =>
        keyData.accidental ?
            acc.addAccidental(index, new Accidental(keyData.accidental)) :
            acc,
        bareNote);

    return noteWithAccidentals;
}
