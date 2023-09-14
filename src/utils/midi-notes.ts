export type Note = keyof typeof Notes;

// =========================
// Notes
// =========================

export namespace ControlChange {
  export const make = (bytes: number[]) => [0xb0, ...bytes];
  export const SustainOff = make([64, 0]);
  export const SustainOn = make([64, 64]);
}

export const NoteOn = 144;
export const NoteOff = 128;
export const Notes = {
  ["A0"]: "A0",
  ["A#0"]: "A#0",
  ["B0"]: "B0",
  ["C1"]: "C1",
  ["C#1"]: "C#1",
  ["D1"]: "D1",
  ["D#1"]: "D#1",
  ["E1"]: "E1",
  ["F1"]: "F1",
  ["F#1"]: "F#1",
  ["G1"]: "G1",
  ["G#1"]: "G#1",
  ["A1"]: "A1",
  ["A#1"]: "A#1",
  ["B1"]: "B1",
  ["C2"]: "C2",
  ["C#2"]: "C#2",
  ["D2"]: "D2",
  ["D#2"]: "D#2",
  ["E2"]: "E2",
  ["F2"]: "F2",
  ["F#2"]: "F#2",
  ["G2"]: "G2",
  ["G#2"]: "G#2",
  ["A2"]: "A2",
  ["A#2"]: "A#2",
  ["B2"]: "B2",
  ["C3"]: "C3",
  ["C#3"]: "C#3",
  ["D3"]: "D3",
  ["D#3"]: "D#3",
  ["E3"]: "E3",
  ["F3"]: "F3",
  ["F#3"]: "F#3",
  ["G3"]: "G3",
  ["G#3"]: "G#3",
  ["A3"]: "A3",
  ["A#3"]: "A#3",
  ["B3"]: "B3",
  ["C4"]: "C4",
  ["C#4"]: "C#4",
  ["D4"]: "D4",
  ["D#4"]: "D#4",
  ["E4"]: "E4",
  ["F4"]: "F4",
  ["F#4"]: "F#4",
  ["G4"]: "G4",
  ["G#4"]: "G#4",
  ["A4"]: "A4",
  ["A#4"]: "A#4",
  ["B4"]: "B4",
  ["C5"]: "C5",
  ["C#5"]: "C#5",
  ["D5"]: "D5",
  ["D#5"]: "D#5",
  ["E5"]: "E5",
  ["F5"]: "F5",
  ["F#5"]: "F#5",
  ["G5"]: "G5",
  ["G#5"]: "G#5",
  ["A5"]: "A5",
  ["A#5"]: "A#5",
  ["B5"]: "B5",
  ["C6"]: "C6",
  ["C#6"]: "C#6",
  ["D6"]: "D6",
  ["D#6"]: "D#6",
  ["E6"]: "E6",
  ["F6"]: "F6",
  ["F#6"]: "F#6",
  ["G6"]: "G6",
  ["G#6"]: "G#6",
  ["A6"]: "A6",
  ["A#6"]: "A#6",
  ["B6"]: "B6",
  ["C7"]: "C7",
  ["C#7"]: "C#7",
  ["D7"]: "D7",
  ["D#7"]: "D#7",
  ["E7"]: "E7",
  ["F7"]: "F7",
  ["F#7"]: "F#7",
  ["G7"]: "G7",
  ["G#7"]: "G#7",
  ["A7"]: "A7",
  ["A#7"]: "A#7",
  ["B7"]: "B7",
  ["C8"]: "C8",
  ["C#8"]: "C#8",
  ["D8"]: "D8",
  ["D#8"]: "D#8",
  ["E8"]: "E8",
  ["F8"]: "F8",
  ["F#8"]: "F#8",
  ["G8"]: "G8",
  ["G#8"]: "G#8",
  ["A8"]: "A8",
  ["A#8"]: "A#8",
  ["B8"]: "B8",
  ["C9"]: "C9",
  ["C#9"]: "C#9",
  ["D9"]: "D9",
  ["D#9"]: "D#9",
  ["E9"]: "E9",
  ["F9"]: "F9",
  ["F#9"]: "F#9",
  ["G9"]: "G9",
} as const;

export const NotesRaw = [
  ["A0", 21],
  ["A#0", 22],
  ["B0", 23],
  ["C1", 24],
  ["C#1", 25],
  ["D1", 26],
  ["D#1", 27],
  ["E1", 28],
  ["F1", 29],
  ["F#1", 30],
  ["G1", 31],
  ["G#1", 32],
  ["A1", 33],
  ["A#1", 34],
  ["B1", 35],
  ["C2", 36],
  ["C#2", 37],
  ["D2", 38],
  ["D#2", 39],
  ["E2", 40],
  ["F2", 41],
  ["F#2", 42],
  ["G2", 43],
  ["G#2", 44],
  ["A2", 45],
  ["A#2", 46],
  ["B2", 47],
  ["C3", 48],
  ["C#3", 49],
  ["D3", 50],
  ["D#3", 51],
  ["E3", 52],
  ["F3", 53],
  ["F#3", 54],
  ["G3", 55],
  ["G#3", 56],
  ["A3", 57],
  ["A#3", 58],
  ["B3", 59],
  ["C4", 60],
  ["C#4", 61],
  ["D4", 62],
  ["D#4", 63],
  ["E4", 64],
  ["F4", 65],
  ["F#4", 66],
  ["G4", 67],
  ["G#4", 68],
  ["A4", 69],
  ["A#4", 70],
  ["B4", 71],
  ["C5", 72],
  ["C#5", 73],
  ["D5", 74],
  ["D#5", 75],
  ["E5", 76],
  ["F5", 77],
  ["F#5", 78],
  ["G5", 79],
  ["G#5", 80],
  ["A5", 81],
  ["A#5", 82],
  ["B5", 83],
  ["C6", 84],
  ["C#6", 85],
  ["D6", 86],
  ["D#6", 87],
  ["E6", 88],
  ["F6", 89],
  ["F#6", 90],
  ["G6", 91],
  ["G#6", 92],
  ["A6", 93],
  ["A#6", 94],
  ["B6", 95],
  ["C7", 96],
  ["C#7", 97],
  ["D7", 98],
  ["D#7", 99],
  ["E7", 100],
  ["F7", 101],
  ["F#7", 102],
  ["G7", 103],
  ["G#7", 104],
  ["A7", 105],
  ["A#7", 106],
  ["B7", 107],
  ["C8", 108],
  ["C#8", 109],
  ["D8", 110],
  ["D#8", 111],
  ["E8", 112],
  ["F8", 113],
  ["F#8", 114],
  ["G8", 115],
  ["G#8", 116],
  ["A8", 117],
  ["A#8", 118],
  ["B8", 119],
  ["C9", 120],
  ["C#9", 121],
  ["D9", 122],
  ["D#9", 123],
  ["E9", 124],
  ["F9", 125],
  ["F#9", 126],
  ["G9", 127],
] as const;

export const BlackNotes = new Set(
  NotesRaw.map((x): Note => x[0]).filter((note) => note[1] === "#"),
);

export const NotesIndex = new Map<Note, number>(
  NotesRaw.map(([note, _], index) => [note, index]),
);

export const fromIndex = (i: number): Note => {
  const entry = NotesRaw[i];
  if (!entry) throw new Error("Invalid Index");
  return entry[0];
};

export const NotesValue: Map<Note, number> = new Map(NotesRaw);

export const isBlack = (note: Note) => BlackNotes.has(note);

export const midiOf = (note: Note) => NotesValue.get(note) as number;

export const indexOf = (note: Note) => NotesIndex.get(note) as number;

export const shift = (note: Note, shift: number): Note =>
  NotesRaw[shiftIntoIndex(note, shift)][0];

export const shiftIntoIndex = (note: Note, shift: number) =>
  Math.min(NotesRaw.length - 1, Math.max(0, indexOf(note) + shift));

export const clamp = (note: Note, min: Note, max: Note): Note => {
  const noteI = indexOf(note);
  const minI = indexOf(min);
  const maxI = indexOf(max);
  const clampI = Math.min(maxI, Math.max(noteI, minI));
  const clamp = NotesRaw[clampI][0];
  return clamp;
};

export const DEFAULT_NOTE = Notes["C3"];
