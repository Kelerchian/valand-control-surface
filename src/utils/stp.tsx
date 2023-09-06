const NOP = <T extends unknown>(_: T) => {};

export const SelfTriggerablePromise = <T extends unknown = void>() => {
  let trigger = NOP<T>;
  const promise = new Promise((res) => {
    trigger = res;
  });

  return {
    trigger,
    promise,
  };
};
