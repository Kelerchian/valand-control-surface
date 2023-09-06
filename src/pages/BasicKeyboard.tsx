import { useEffect, useRef, useState } from "react";
import s from "./BasicKeyboard.module.scss";
import classNames from "classnames";
import {
  DEFAULT_NOTE,
  Note,
  NoteOff,
  NoteOn,
  NotesRaw,
  clamp,
  indexOf,
  isBlack,
  midiOf,
  shift,
  fromIndex,
} from "../utils/midi-notes";
import { Serv } from "../serv/serv";
import { ServReact } from "../serv/serv-react";
import { send } from "../ipc_frontend";
import { Obs } from "../serv/obs";
import { Destruction } from "../serv/destruction";

export namespace KeyboardLayout {
  export const KEYBOARD_MAPPING = [
    "KeyQ",
    "KeyA",
    "KeyW",
    "KeyS",
    "KeyE",
    "KeyD",
    "KeyR",
    "KeyF",
    "KeyT",
    "KeyG",
    "KeyY",
    "KeyH",
    "KeyU",
    "KeyJ",
    "KeyI",
    "KeyK",
    "KeyO",
    "KeyL",
    "KeyP",
    "Semicolon",
    "BracketLeft",
    "Quote",
  ] as const;

  export const EnumeratedWhiteNotes = NotesRaw.map(
    (note, i) => [i, note] as const,
  ).filter(([_, note]) => !isBlack(note[0]));

  // TRUE = black
  // FALSE = white
  export const KEYBOARD_ZIG_ZAG_MAPPING: Readonly<boolean[]> = new Array(
    KEYBOARD_MAPPING.length,
  )
    .fill(null)
    .map((_, x) => x % 2 === 0);

  export const WHITE_SLOTS = 11;

  export const MAX_BOTTOM_NOTE_RAW =
    NotesRaw[
      EnumeratedWhiteNotes[EnumeratedWhiteNotes.length - WHITE_SLOTS][0]
    ];

  console.log(MAX_BOTTOM_NOTE_RAW);

  const findNearestWhiteNoteIndex = (initialIndex: number) => {
    let i = initialIndex;
    while (true) {
      if (!isBlack(fromIndex(i))) {
        return i;
      }
      i--;
    }
  };

  export const generateMapping = (startNote: Note) => {
    // clamp note index
    const startNoteIndex = findNearestWhiteNoteIndex(indexOf(startNote));

    const enumeratedWhiteNotes = EnumeratedWhiteNotes.filter(
      ([i]) => i >= startNoteIndex,
    );
    const firstIndex = enumeratedWhiteNotes[0][0];
    const lastIndex = enumeratedWhiteNotes[WHITE_SLOTS - 1][0];

    const notes = NotesRaw.slice(firstIndex, lastIndex + 1);

    const mappingStack = [...KEYBOARD_ZIG_ZAG_MAPPING].map((black, order) => ({
      black,
      order,
    }));

    const popMatchingColorFromStack = (queriedColor: boolean) => {
      while (true) {
        const data = mappingStack.shift();

        if (!data) {
          throw new Error(
            `Weird Error: popMappingUntilColor is prematurely empty (${notes.length}) note starts at: ${startNote}, startNoteIndex ${startNoteIndex}`,
          );
        }

        const { black } = data;

        if (queriedColor === black) {
          return data;
        }
      }
    };

    const mapping = notes.map(([note]) => {
      const { black, order } = popMatchingColorFromStack(isBlack(note));
      return {
        black,
        code: KEYBOARD_MAPPING[order],
        note,
      };
    });

    const codeToNote = new Map<string, Note>(
      [...mapping].map(({ code, note }) => [code, note]),
    );

    const noteToCode = new Map<Note, string>(
      [...mapping].map(({ code, note }) => [note, code]),
    );

    return {
      codeToNote,
      noteToCode,
      mapping,
    };
  };
}

export const KeyboardLayoutAgent = () =>
  Serv.build()
    .channels((channels) => ({
      ...channels,
      onNoteChange: Obs.make<Note>(),
    }))
    .api(({ onDestroy, channels }) => {
      const pressedNotes = new Set<Note>();
      const pressedKeyNoteRec = new Map<string, Note>();
      const MIN_NOTE: Note = NotesRaw[0][0];
      const MAX_NOTE: Note = KeyboardLayout.MAX_BOTTOM_NOTE_RAW[0];

      let startNote: Note = DEFAULT_NOTE;
      let mapping = KeyboardLayout.generateMapping(startNote);
      let initialized = false;
      let shiftBoost = false;

      const shiftLeft = () => {
        do {
          startNote = shift(startNote, (shiftBoost ? 12 : 1) * -1);
        } while (isBlack(startNote));
        startNote = clamp(startNote, MIN_NOTE, MAX_NOTE);
        mapping = KeyboardLayout.generateMapping(startNote);
      };

      const shiftRight = () => {
        do {
          startNote = shift(startNote, (shiftBoost ? 12 : 1) * 1);
        } while (isBlack(startNote));
        startNote = clamp(startNote, MIN_NOTE, MAX_NOTE);
        mapping = KeyboardLayout.generateMapping(startNote);
      };

      const init = () => {
        if (initialized) return;

        const captureSpecialControl = (code: string, down: boolean) => {
          switch (code) {
            case "Comma": {
              if (!down) return;
              shiftLeft();
              return true;
            }
            case "Period": {
              if (!down) return;
              shiftRight();
              return true;
            }
            case "ShiftLeft":
            case "ShiftRight": {
              shiftBoost = down;
              return true;
            }
          }
          return false;
        };

        const onKeyDown = (e: KeyboardEvent) => {
          const code = e.code;
          if (captureSpecialControl(code, true)) {
            channels.change.emit();
            return;
          }

          if (pressedKeyNoteRec.has(code)) return;
          const note = mapping.codeToNote.get(code);
          if (!note) return;

          pressedNotes.add(note);
          pressedKeyNoteRec.set(code, note);
          send([NoteOn, midiOf(note), 100]);
          channels.onNoteChange.emit(note);
        };

        const onKeyUp = (e: KeyboardEvent) => {
          const code = e.code;
          if (captureSpecialControl(code, false)) {
            channels.change.emit();
            return;
          }

          const note = pressedKeyNoteRec.get(code);
          pressedKeyNoteRec.delete(code);
          if (!note) return;

          pressedNotes.delete(note);
          send([NoteOff, midiOf(note), 100]);
          channels.onNoteChange.emit(note);
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        onDestroy(() => {
          document.removeEventListener("keydown", onKeyDown);
          document.removeEventListener("keyup", onKeyUp);
        });
      };

      return {
        init,
        noteToCode: (note: Note): string =>
          mapping.noteToCode.get(note) as string,
        mapping: () => mapping.mapping as Readonly<typeof mapping.mapping>,
        noteIsPressed: (note: Note) => {
          return pressedNotes.has(note);
        },
      };
    })
    .finish();

export const KeyboardSizingAgent = () =>
  Serv.build()
    .channels((channels) => ({
      ...channels,
      tutsWidthChange: Obs.make<void>(),
    }))
    .api(({ channels }) => {
      let baseTutsWidth = 0;
      return {
        set: (w: number) => {
          baseTutsWidth = w;
          channels.tutsWidthChange.emit();
        },
        sizing: () => {
          const whiteTutsWidth = baseTutsWidth;
          const blackTutsWidth = baseTutsWidth * 0.7;
          const blackTutsLeft = -(blackTutsWidth / 2);
          return { whiteTutsWidth, blackTutsWidth, blackTutsLeft };
        },
      };
    })
    .finish();

export const KeyboardRecordContext =
  ServReact.Context.make<ReturnType<typeof KeyboardLayoutAgent>>();

export const KeyboardSizingContext =
  ServReact.Context.make<ReturnType<typeof KeyboardSizingAgent>>();

export const StackKeyboard = (props: { onUnsetPort: () => unknown }) => {
  const keyboardRef = useRef<HTMLDivElement>(null);
  const keyboardLayout = ServReact.useOwned(KeyboardLayoutAgent);
  const keyboardSizing = ServReact.useOwned(KeyboardSizingAgent);

  const mapping = keyboardLayout.api.mapping();

  useEffect(() => {
    keyboardLayout.api.init();
  }, [keyboardLayout]);

  useEffect(() => {
    const adjustTutsWidth = () => {
      const boardWidth = keyboardRef.current?.clientWidth || 0;
      keyboardSizing.api.set(boardWidth / KeyboardLayout.WHITE_SLOTS);
    };

    adjustTutsWidth();

    window.addEventListener("resize", adjustTutsWidth);
    return () => {
      window.removeEventListener("resize", adjustTutsWidth);
    };
  }, [keyboardRef.current]);

  return (
    <KeyboardRecordContext.Provider value={keyboardLayout}>
      <KeyboardSizingContext.Provider value={keyboardSizing}>
        <div>
          <button onClick={() => props.onUnsetPort()}>Back</button>
          <div>Connected to: [TODO]</div>
          <div ref={keyboardRef} className={s.keyboard}>
            {mapping.map((entry) => (
              <Tuts key={`${entry.code}-${entry.note}`} note={entry.note} />
            ))}
          </div>
        </div>
      </KeyboardSizingContext.Provider>
    </KeyboardRecordContext.Provider>
  );
};

export const Tuts = ({ note }: { note: Note }) => {
  const black = isBlack(note);
  const keyboardSizing = KeyboardSizingContext.use();
  const keyboardLayout = KeyboardRecordContext.use();
  const keybinding = keyboardLayout.api.noteToCode(note);
  const pressed = keyboardLayout.api.noteIsPressed(note);
  const [_, setSymbol] = useState(Symbol());

  const sizing = keyboardSizing.api.sizing();
  const isC = note.startsWith("C");

  useEffect(() => {
    const destructions = Destruction.make();
    const refresh = () => setSymbol(Symbol());

    destructions.addHook(
      keyboardLayout.channels.onNoteChange.sub((x) => {
        if (x !== note) return;
        refresh();
      }),
    );

    destructions.addHook(
      keyboardSizing.channels.tutsWidthChange.sub(() => {
        refresh();
      }),
    );

    return () => {
      destructions.destroy();
    };
  }, [note, keyboardLayout]);

  return (
    <div
      style={{
        width: !black ? sizing.whiteTutsWidth : 0,
      }}
      className={classNames(s.tuts, black && s.black)}
    >
      <div
        style={{
          width: !black ? sizing.whiteTutsWidth : sizing.blackTutsWidth,
          left: !black ? 0 : sizing.blackTutsLeft,
        }}
        className={classNames(s.inner, pressed && s.pressed, black && s.black)}
      >
        <div className={classNames(s.note, isC && s.c)}>{note}</div>
        <div className={s.key}>{keybinding}</div>
      </div>
    </div>
  );
};
