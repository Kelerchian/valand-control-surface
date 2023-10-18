// file: s-error.ts
import * as t from "io-ts";

// Helper types
type SignedError<T extends string, P extends unknown> = {
  sign: T;
  data: P;
  stack: string | undefined;
};
type Factory<T extends string, P extends unknown> = {
  readonly sign: T;
  readonly codec: t.Type<SignedError<T, P>>;
  readonly make: (p: P) => SignedError<T, P>;
  readonly is: (data: unknown) => data is SignedError<T, P>;
};

// Error callstack signature recreated with "io-ts"
const Stack = t.union([t.string, t.undefined]);

// The core design "tool"
export const design = <T extends string, P extends unknown>(
  sign: T,
  Payload: t.Type<P>,
): Factory<T, P> => {
  const codec = t.type({ sign: t.literal(sign), data: Payload, stack: Stack });

  const make = (data: P): SignedError<T, P> => {
    // extract stacktrace from a real error
    const error = new Error();
    error.name = sign;
    const stack = error.stack;
    return { sign, data, stack };
  };

  const is = (d: unknown): d is t.TypeOf<typeof codec> => codec.is(d);

  return { sign, codec, make, is };
};

export type TypeOf<F extends Factory<any, any>> = F extends Factory<
  infer T,
  infer P
>
  ? SignedError<T, P>
  : never;

const ConnectionError = design("ConnectionError", t.null);
type ConnectionError = TypeOf<typeof ConnectionError>;

const PingPongError = design("PingPongError", t.null);
type PingPongError = TypeOf<typeof PingPongError>;

const c = null as any as ConnectionError | PingPongError;

switch (c.sign) {
  case PingPongError.sign:
  case ConnectionError.sign:
}
