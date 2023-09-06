import { Serv } from "./serv/serv";
import { PortSelector } from "./pages/PortSelector";
import * as E from "fp-ts/Either";
import "./App.css";
import {
  hasActivePort,
  listenMidiPortUpdateEvent,
  setPort,
  unsetPort,
} from "./ipc_frontend";
import { SelfTriggerablePromise } from "./utils/stp";
import { ServReact } from "./serv/serv-react";
import { useEffect } from "react";
import { StackKeyboard } from "./pages/BasicKeyboard";

const Agent = () =>
  Serv.build()
    .id("AppAgent" + String(Math.random()))
    .api(({ onDestroy, channels, id }) => {
      let isPortActive = false as true | false | null;

      const refreshIsPortActive = async () => {
        isPortActive = null;
        channels.change.emit();
        const res = await hasActivePort();
        if (E.isRight(res)) {
          isPortActive = res.right;
          channels.change.emit();
        }
      };

      let _init = false;
      const init = async () => {
        if (_init) return;
        _init = true;

        const stp = SelfTriggerablePromise();
        onDestroy(stp.trigger);

        const unlisten = await listenMidiPortUpdateEvent(refreshIsPortActive);
        stp.promise.then(() => {
          unlisten();
        });

        await refreshIsPortActive();
      };

      return {
        init,
        isPortActive: () => isPortActive,
      };
    })
    .finish();

const App = () => {
  const agent = ServReact.useOwned(Agent);
  useEffect(() => {
    agent.api.init();
  }, [agent]);
  const isPortActive = agent.api.isPortActive();

  return (
    <div>
      {isPortActive === null && "Loading"}
      {isPortActive === true && (
        <StackKeyboard onUnsetPort={() => unsetPort()} />
      )}
      {isPortActive === false && (
        <PortSelector
          onSelectPort={async (index, name) =>
            setPort({
              port_index: index,
              port_name: name,
            })
          }
        />
      )}
    </div>
  );
};

export default App;
