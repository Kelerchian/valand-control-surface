type Listener<T> = (message: T) => unknown;

export type Obs<T extends any> = {
  pipe: (obs: Obs<T>) => () => unknown;
  unpipe: (obs: Obs<T>) => unknown;
  sub: (listener: Listener<T>) => () => unknown;
  unsub: (listener: Listener<T>) => void;
  emit: (t: T) => unknown[];
  size: () => number;
};

export namespace Obs {
  export const make = <T extends any>(): Obs<T> => {
    const set = new Set<Listener<T>>();
    const linkedObs = new Set<Obs<T>>();

    const pipe: Obs<T>["pipe"] = (o) => {
      linkedObs.add(o);
      return () => unpipe(o);
    };

    const unpipe: Obs<T>["unpipe"] = (o) => linkedObs.delete(o);

    const unsub: Obs<T>["unsub"] = (listener) => {
      set.delete(listener);
    };

    const sub: Obs<T>["sub"] = (listener) => {
      set.add(listener);
      return () => unsub(listener);
    };

    const emit: Obs<T>["emit"] = (data) => {
      const res = Array.from(set).map((listener) => listener(data));
      Array.from(linkedObs).forEach(ob => ob.emit(data))
      return res;
    };
    const size = () => set.size;

    return {
      pipe,
      unpipe,
      sub,
      unsub,
      emit,
      size,
    };
  };
}
