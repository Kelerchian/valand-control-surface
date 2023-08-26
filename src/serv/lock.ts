import * as O from "fp-ts/Option";
import { Obs } from "./obs";

export namespace Locks {
  export const BoolLock = () => {
    const obs = Obs.make<void>();
    let isLocked = false;
    return {
      change: obs,
      isLocked: () => isLocked,
      withLock: async <T>(fn: () => Promise<T>) => {
        if (isLocked) return O.none;
        isLocked = true;
        obs.emit();
        const res = await fn();
        isLocked = false;
        obs.emit();
        return O.some(res);
      },
    };
  };
}
