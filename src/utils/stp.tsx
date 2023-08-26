const NOP = <T extends unknown>(t: T) => {};

export const STP = <T extends unknown = void>() => {
  let trigger = NOP<T>;
  const promise = new Promise((res) => {
    trigger = res;
  });

  return {
    trigger,
    promise,
  };
};
