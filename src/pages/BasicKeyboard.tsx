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
  ControlChange,
} from "../utils/midi-notes";
import { Serv } from "../serv/serv";
import { ServReact } from "../serv/serv-react";
import { send } from "../ipc_frontend";
import { Obs } from "../serv/obs";
import { Destruction } from "../serv/destruction";
import { ObsValcon } from "../serv/valcon";

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

  export const ControlVolumes = [13, 25, 38, 51, 64, 76, 89, 100, 114, 127];

  export const EnumeratedWhiteNotes = NotesRaw.map(
    (note, i) => [i, note] as const,
  ).filter(([_, note]) => !isBlack(note[0]));

  export const WHITE_SLOTS = 11;

  export const MAX_NOTE_RAW =
    NotesRaw[
      EnumeratedWhiteNotes[EnumeratedWhiteNotes.length - WHITE_SLOTS][0]
    ];

  export namespace KeyboardZigZag {
    export type MappingStackRes = {
      black: boolean;
      code: (typeof KEYBOARD_MAPPING)[number];
    };
    // TRUE = black
    // FALSE = white
    const KEYBOARD_ZIG_ZAG_MAPPING: Readonly<boolean[]> = new Array(
      KEYBOARD_MAPPING.length,
    )
      .fill(null)
      .map((_, x) => x % 2 === 0);

    // Create a zig-zag black-white mapping and then pop-front the first matching boolean
    // (black = true, white = false)
    export const createColorMappingStack = () => {
      const mappingStack = [...KEYBOARD_ZIG_ZAG_MAPPING].map(
        (black, order) => ({
          black,
          order,
        }),
      );

      const popMatchingColorFromStack = (
        isBlack: boolean,
      ): null | MappingStackRes => {
        while (true) {
          const data = mappingStack.shift();
          if (!data) return null;
          const { black, order } = data;
          if (isBlack === black) {
            return {
              black,
              code: KEYBOARD_MAPPING[order],
            };
          }
        }
      };

      return {
        pop: popMatchingColorFromStack,
      };
    };
  }

  export type MappingBasic = {
    mapping: {
      black: boolean;
      code: (typeof KEYBOARD_MAPPING)[number];
      note: Note;
    }[];
    startNote: Note;
  };

  export namespace KeyboardMappingCamShifted {
    const findNearestWhiteNoteIndex = (initialIndex: number) => {
      let i = initialIndex;
      while (true) {
        if (!isBlack(fromIndex(i))) {
          return i;
        }
        i--;
      }
    };

    export const make = (inputStartNote: Note): MappingBasic => {
      const startNoteIndex = findNearestWhiteNoteIndex(indexOf(inputStartNote));
      const startNote = NotesRaw[startNoteIndex][0];
      // white counting starts here
      const enumeratedWhiteNotes = EnumeratedWhiteNotes.filter(
        ([i]) => i >= startNoteIndex,
      );
      const firstIndex = enumeratedWhiteNotes[0][0];
      const lastIndex = enumeratedWhiteNotes[WHITE_SLOTS - 1][0];
      const notes = NotesRaw.slice(firstIndex, lastIndex + 1);

      const colorMappingStack = KeyboardZigZag.createColorMappingStack();

      const mapping = notes.map(([note]) => {
        const data = colorMappingStack.pop(isBlack(note));
        if (!data) {
          throw new Error(
            `Weird Error: popMappingUntilColor is prematurely empty (${notes.length}), startNote (${startNote}), startNoteIndex ${startNoteIndex}`,
          );
        }
        return { ...data, note };
      });

      return {
        mapping,
        startNote,
      };
    };
  }

  export namespace KeyboardMappingPitchShifted {
    const colorMapping = (() => {
      const stack = KeyboardZigZag.createColorMappingStack();
      return [
        false,
        true,
        false,
        true,
        false,

        false,
        true,
        false,
        true,
        false,
        true,
        false,

        false,
        true,
        false,
        true,
        false,

        false,
      ].map((x) => stack.pop(x) as KeyboardZigZag.MappingStackRes);
    })();

    export const make = (startNote: Note): MappingBasic => {
      const firstIndex = indexOf(startNote);
      const lastIndex = firstIndex + 17;
      const notes = NotesRaw.slice(firstIndex, lastIndex + 1);

      const mapping = notes.map(([note], index) => {
        const data = colorMapping[index] || null;
        if (!data) {
          throw new Error(
            `Weird Error: popMappingUntilColor is prematurely empty (${notes.length}), startNote (${startNote}), startNoteIndex ${firstIndex}`,
          );
        }
        const { black, code } = data;
        return {
          black,
          code,
          note,
        };
      });

      return {
        mapping,
        startNote,
      };
    };
  }

  export const generateMapping = (
    inputStartNote: Note,
    pitchShiftInsteadOfCamShift: boolean,
  ) => {
    const { mapping, startNote } = pitchShiftInsteadOfCamShift
      ? KeyboardMappingPitchShifted.make(inputStartNote)
      : KeyboardMappingCamShifted.make(inputStartNote);

    const codeToNote = new Map<string, Note>(
      [...mapping].map(({ code, note }) => [code, note]),
    );

    const noteToCode = new Map<Note, string>(
      [...mapping].map(({ code, note }) => [note, code]),
    );

    return {
      startNote,
      codeToNote,
      noteToCode,
      mapping,
    };
  };
}

const LayoutAgent = () =>
  Serv.build()
    .channels((channels) => ({
      ...channels,
      onNoteChange: Obs.make<Note>(),
      onControlChange: Obs.make<void>(),
    }))
    .api(({ onDestroy, channels }) => {
      const pressedNotes = new Set<Note>();
      const pressedKeyNoteRec = new Map<string, Note>();
      const MIN_NOTE: Note = NotesRaw[0][0];
      const MAX_NOTE: Note = KeyboardLayout.MAX_NOTE_RAW[0];

      // Adjustables

      const generateMapping = () =>
        KeyboardLayout.generateMapping(startNote.get(), translateByPitch.get());

      const getTranslateBoostValue = () => (translateBoost.get() ? 12 : 1);

      const getVelocity = () => {
        const val = velocityControl.get().base;
        const rand = (() => {
          switch (velocityControl.get().randomizer) {
            case "high":
              return Math.round(Math.random() * 50 - 25);
            case "medium":
              return Math.round(Math.random() * 30 - 15);
            case "low":
              return Math.round(Math.random() * 10 - 5);
          }
          return 0;
        })();

        return Math.min(Math.max(val + rand, 0), 127);
      };

      const velocityControl = ObsValcon<{
        base: number; // 0 - 127
        randomizer: "low" | "medium" | "high" | "off";
      }>({
        base: 100,
        randomizer: "medium",
      });
      const translateByPitch = ObsValcon(false);
      const translateBoost = ObsValcon(false);
      const startNote = ObsValcon<Note>(DEFAULT_NOTE);
      const sustainCon = ObsValcon<boolean>(false);
      const mapping = ObsValcon(generateMapping());

      // Local Values

      let initialized = false;

      // Event pipes and reactions
      [startNote.obs, translateByPitch.obs, velocityControl.obs].map((obs) =>
        obs.sub(() => {
          mapping.set(generateMapping());
          channels.onControlChange.emit();
        }),
      );

      mapping.obs.sub(() => {
        channels.change.emit();
      });

      sustainCon.obs.sub((on) => {
        send(on ? ControlChange.SustainOn : ControlChange.SustainOff);
        channels.onControlChange.emit();
      });

      // Utils

      // Special Control

      const mutShiftAndClamp = (shiftVal: number) => {
        const isBlackAllowed = translateByPitch.get();
        let note: Note = startNote.get();
        const needsToShiftFurther = () => !isBlackAllowed && isBlack(note);

        do {
          note = shift(note, shiftVal);
          note = clamp(note, MIN_NOTE, MAX_NOTE);
        } while (needsToShiftFurther());

        startNote.set(note);
      };

      const translateLeft = () =>
        mutShiftAndClamp(getTranslateBoostValue() * -1);

      const translateRight = () =>
        mutShiftAndClamp(getTranslateBoostValue() * 1);

      const sustain = (on: boolean) => sustainCon.set(on);

      const toggleTranslateBoost = (on: boolean) => translateBoost.set(on);

      const translateByPitchToggle = () => {
        translateByPitch.set(!translateByPitch.get());
      };

      const captureSpecialControl = (e: KeyboardEvent, down: boolean) => {
        if (e.code.startsWith("Digit") && !e.repeat && down) {
          const digit = Number(e.code.slice(5));
          if (!Number.isNaN(digit)) {
            const index = (digit + 10 - 1) % 10;
            const val = KeyboardLayout.ControlVolumes[index] || undefined;
            if (val) {
              velocityControl.set({ ...velocityControl.get(), base: val });
            }
          }
          return true;
        }

        switch (e.code) {
          case "Comma": {
            if (!down) return;
            translateLeft();
            return true;
          }
          case "Period": {
            if (!down) return;
            translateRight();
            return true;
          }
          case "ShiftLeft": {
            if (e.repeat) return;
            sustain(down);
            return true;
          }
          case "ControlLeft": {
            toggleTranslateBoost(down);
            return true;
          }
          case "Backquote": {
            if (!down) return;
            translateByPitchToggle();
            return true;
          }
        }
        return false;
      };

      // Init

      const onKeyDown = (e: KeyboardEvent) => {
        if (captureSpecialControl(e, true)) {
          return;
        }
        const code = e.code;

        if (pressedKeyNoteRec.has(code)) return;
        const note = mapping.get().codeToNote.get(code);
        if (!note) return;

        const velocity = getVelocity();

        pressedNotes.add(note);
        pressedKeyNoteRec.set(code, note);
        send([NoteOn, midiOf(note), velocity]);
        channels.onNoteChange.emit(note);
      };

      const onKeyUp = (e: KeyboardEvent) => {
        const code = e.code;
        if (captureSpecialControl(e, false)) {
          channels.change.emit();
          return;
        }

        const note = pressedKeyNoteRec.get(code);
        pressedKeyNoteRec.delete(code);
        if (!note) return;

        const velocity = 127;

        pressedNotes.delete(note);
        send([NoteOff, midiOf(note), velocity]);
        channels.onNoteChange.emit(note);
      };

      const init = () => {
        if (initialized) return;

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
          mapping.get().noteToCode.get(note) as string,
        mapping: () => {
          const retval = mapping.get().mapping;
          return retval as Readonly<typeof retval>;
        },
        noteIsPressed: (note: Note) => pressedNotes.has(note),
        controls: {
          velocityControl,
          sustainCon,
          translateLeft,
          translateRight,
          translateByPitchToggle,
          translateByPitch,
        },
      };
    })
    .finish();

const SizingAgent = () =>
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

const LayoutContext = ServReact.Context.make<ReturnType<typeof LayoutAgent>>();

const SizingContext = ServReact.Context.make<ReturnType<typeof SizingAgent>>();

export const StackKeyboard = (props: { onUnsetPort: () => unknown }) => {
  const keyboardRef = useRef<HTMLDivElement>(null);
  const keyboardLayout = ServReact.useOwned(LayoutAgent);
  const keyboardSizing = ServReact.useOwned(SizingAgent);

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
    <LayoutContext.Provider value={keyboardLayout}>
      <SizingContext.Provider value={keyboardSizing}>
        <div>
          <Control onUnset={props.onUnsetPort} />
          <div>Connected to: [TODO]</div>
          <div ref={keyboardRef} className={s.keyboard}>
            {mapping.map((entry) => (
              <Tuts
                key={`${entry.code}-${entry.note}-${entry.black ? "1" : "0"}`}
                entry={entry}
              />
            ))}
          </div>
        </div>
      </SizingContext.Provider>
    </LayoutContext.Provider>
  );
};

const Control = (props: { onUnset: () => unknown }) => {
  const keyboardLayout = LayoutContext.use();

  ServReact.useObs(keyboardLayout.channels.onControlChange);

  return (
    <div className={s.control}>
      <div className={s.controlRow}>
        <button onClick={() => props.onUnset}>Back</button>
        <button
          title="Press (>) Key"
          onClick={() => keyboardLayout.api.controls.translateLeft()}
        >
          {"< Shift"}
        </button>
        <button
          title="Press (<) Key"
          onClick={() => keyboardLayout.api.controls.translateRight()}
        >
          {"Shift >"}
        </button>
        <button
          title="Hold Shift"
          type="button"
          className={classNames(
            keyboardLayout.api.controls.sustainCon.get() && s.controlOn,
          )}
        >
          Sustain
        </button>
        <button type="button" title="Press Tilde (`) key">
          Mode:{" "}
          {keyboardLayout.api.controls.translateByPitch.get()
            ? "Shift by Pitch"
            : "Shift by Translation"}
        </button>
      </div>
      <div className={s.controlRow}>
        <label>Velo:</label>
        {KeyboardLayout.ControlVolumes.map((x, i) => (
          <button
            key={`velo-${x}`}
            type="button"
            className={classNames(
              keyboardLayout.api.controls.velocityControl.get().base === x &&
                s.controlOn,
            )}
            onClick={() => {
              keyboardLayout.api.controls.velocityControl.set({
                ...keyboardLayout.api.controls.velocityControl.get(),
                base: x,
              });
            }}
          >
            {(i + 1) % 10}
          </button>
        ))}
        <div>
          <label>Random</label>
          <select
            value={keyboardLayout.api.controls.velocityControl.get().randomizer}
            onChange={(x) => {
              keyboardLayout.api.controls.velocityControl.set({
                ...keyboardLayout.api.controls.velocityControl.get(),
                randomizer: x.target.value as any,
              });
            }}
          >
            <option value="off">Off</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export const Tuts = ({
  entry: { black, code, note },
}: {
  entry: KeyboardLayout.MappingBasic["mapping"][number];
}) => {
  const keyboardSizing = SizingContext.use();
  const keyboardLayout = LayoutContext.use();
  const pressed = keyboardLayout.api.noteIsPressed(note);
  const [_, setSymbol] = useState(Symbol());

  const sizing = keyboardSizing.api.sizing();
  const isC = note.startsWith("C") && note[1] !== "#";

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
      className={classNames(s.tuts, black && s.black)}
      style={{
        width: !black ? sizing.whiteTutsWidth : 0,
      }}
    >
      <div
        style={{
          width: !black ? sizing.whiteTutsWidth : sizing.blackTutsWidth,
          left: !black ? 0 : sizing.blackTutsLeft,
        }}
        className={classNames(
          s.inner,
          isC && s.c,
          pressed && s.pressed,
          black && s.black,
        )}
      >
        <div className={classNames(s.note)}>{note}</div>
        <div className={s.key}>{tutsKey(code)}</div>
      </div>
    </div>
  );
};

export const tutsKey = (
  note: (typeof KeyboardLayout.KEYBOARD_MAPPING)[number],
) => {
  switch (note) {
    case "Semicolon":
      return ";";
    case "Quote":
      return "'";
    case "BracketLeft":
      return "[";
  }
  if (note.startsWith("Key")) {
    return note.slice(3);
  }
  return note;
};
