import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { EUtil } from "./utils/ipc-converter";

export const fetchPorts = () =>
  invoke<unknown[]>("fetch_ports").then(EUtil.fromResultArray<null, string>);

export const setPort = (params: { port_index: number; port_name: string }) =>
  EUtil.fromResultPromise(invoke<unknown>("set_port", params));

export const unsetPort = () =>
  EUtil.fromResultPromise(invoke<unknown>("unset_port"));

export const hasActivePort = () =>
  EUtil.fromResultPromise(invoke<boolean>("has_active_port"));

export const listenMidiPortUpdateEvent = (fn: () => unknown) =>
  listen("midi-port-updated", fn);
