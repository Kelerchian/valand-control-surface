/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useState } from "react";
import { Serv } from "./serv";

export { Serv } from "./serv";

export namespace ServReact {
  const DEFAULT_SYMBOL = Symbol();

  export const useOwned = <
    API extends Serv.DefaultAPI,
    Channels extends Serv.DefaultChannels,
    Deps extends readonly any[],
  >(
    factoryFn: () => Serv<API, Channels>,
    deps?: Deps,
  ) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps

    const [serv, setServe] = useState(factoryFn);

    useEffect(() => {
      setServe(factoryFn());
    }, deps || []);

    // destroy when parent is destroyed
    useEffect(() => {
      return () => {
        serv.destroy();
      };
    }, [serv]);

    // subscribe
    use(serv);

    return serv;
  };

  export const use = <
    API extends Serv.DefaultAPI,
    Channels extends Serv.DefaultChannels,
    Deps extends readonly any[],
  >(
    serv: Serv<API, Channels>,
    deps?: Deps,
  ) => {
    const [_, setKey] = useState<Symbol>(DEFAULT_SYMBOL);
    useEffect(() => {
      const unsub = serv.channels.change.sub(() => {
        setKey(Symbol());
      });

      return () => {
        unsub();
      };
    }, [serv, ...(deps || [])]);

    return serv;
  };
}
