import { Serv } from "./serv/serv";
import { PortSelector } from "./pages/PortSelector";
import * as E from "fp-ts/Either";
import "./App.css";
import {
  hasActivePort,
  listenMidiPortUpdateEvent,
  setPort,
} from "./ipc_frontend";
import { STP } from "./utils/stp";
import { ServReact } from "./serv/serv-react";

const Agent = () => {
  const id = "asdf" + String(Math.round(Math.random() * 100));
  return Serv.build()
    .id(id)
    .api(({ addDestroyHook, channels }) => {
      let isPortActive = false;

      const stp = STP();

      const onMidiPortUpdateEvent = async () => {
        const res = await hasActivePort();
        if (E.isRight(res)) {
          isPortActive = res.right;
          channels.change.emit();
        }
      };

      listenMidiPortUpdateEvent(onMidiPortUpdateEvent).then((unlisten) => {
        stp.promise.then(() => {
          unlisten();
        });
      });
      addDestroyHook(() => {
        stp.trigger();
      });
      return {
        isPortActive: () => isPortActive,
      };
    })
    .finish();
};

const App = () => {
  const agent = ServReact.useOwned(Agent);
  const isPortActive = agent.api.isPortActive();

  return (
    <>
      {isPortActive && "Connected to: "}
      {!isPortActive && (
        <PortSelector
          onSelectPort={async (index, name) =>
            setPort({
              port_index: index,
              port_name: name,
            })
          }
        />
      )}
    </>
  );
};

export default App;
