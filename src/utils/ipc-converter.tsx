import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

export namespace EUtil {
  export const UnknownError: unique symbol = Symbol("UnknownError");
  export type UnknownError = typeof UnknownError;

  export const fromResult = <L, R>(
    x: unknown,
  ): E.Either<L | UnknownError, R> => {
    if (typeof x === "object" && x !== null) {
      if ("Ok" in x) {
        return E.right(x.Ok as R);
      }
      if ("Err" in x) {
        return E.left(x.Err as L);
      }
    }
    return E.left(UnknownError);
  };

  export const fromResultArray = <L, R>(
    vec: unknown[],
  ): E.Either<L | UnknownError, R>[] => vec.map(fromResult<L, R>);

  export const fromResultPromise = <R extends unknown>(
    promise: Promise<R>,
  ): Promise<E.Either<null, R>> =>
    TE.tryCatch<null, R>(
      () => promise,
      (_) => null,
    )();
}
