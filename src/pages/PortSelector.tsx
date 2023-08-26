import * as E from "fp-ts/Either";
import { useEffect } from "react";
import { fetchPorts } from "../ipc_frontend";
import { Locks } from "../serv/lock";
import { Serv, ServReact } from "../serv/serv-react";

type Props = {
  onSelectPort: (
    portIndex: number,
    portName: string,
  ) => Promise<E.Either<unknown, unknown>>;
};

export const PortSelectorAPI = (props: Props) =>
  Serv.build()
    .api(({ channels }) => {
      const lock = Locks.BoolLock();
      lock.change.pipe(channels.change);
      return {
        lock,
        ports: null as null | Awaited<ReturnType<typeof fetchPorts>>,
        lastError: null as null | unknown,
      };
    })
    .api(({ channels, prev }) => ({
      isLocked: () => prev.lock.isLocked(),
      lastError: () => prev.lastError,
      ports: () => prev.ports,
      selectPorts: (portIndex: number, portName: string) =>
        prev.lock.withLock(() => props.onSelectPort(portIndex, portName)),
      fetchPorts: () =>
        prev.lock.withLock(async () => {
          prev.ports = null;
          channels.change.emit();
          prev.ports = await fetchPorts();
          channels.change.emit();
        }),
    }))
    .finish();

export const PortSelector = (props: Props) => {
  const agent = ServReact.useOwned(() => PortSelectorAPI(props), []);
  const midiPorts = agent.api.ports();
  const isLocked = agent.api.isLocked();

  useEffect(() => {
    agent.api.fetchPorts();
  }, [agent]);

  return (
    <div className="container">
      {midiPorts && (
        <div>
          {isLocked && "Loading ports"}
          <h4>Ports:</h4>
          {midiPorts.map((port, index) => {
            if (E.isRight(port)) {
              return (
                <button
                  type="button"
                  onClick={() => {
                    agent.api.selectPorts(index, port.right);
                  }}
                  key={`${index}-${port.right}`}
                >
                  {port.right}
                </button>
              );
            }

            return (
              <button type="button" disabled key={`${index}-error`}>
                [invalid port]
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
