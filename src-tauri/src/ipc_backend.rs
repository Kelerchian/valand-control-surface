use tauri::{command, State, Window};

use crate::app_state::AppState;

#[command(rename_all = "snake_case")]
pub fn fetch_ports(state: State<AppState>) -> Vec<Result<String, ()>> {
    state.ports_name()
}

#[command(rename_all = "snake_case")]
pub fn set_port(
    window: Window,
    state: State<AppState>,
    port_index: usize,
    port_name: String,
) -> Result<(), String> {
    let res = state
        .set_port(port_index, port_name)
        .or_else(|err| Err(format!("{}", err)));
    if let Ok(_) = res {
        println!("midi-port-updated");
        let _ = window.emit("midi-port-updated", ());
    }
    res
}

#[command(rename_all = "snake_case")]
pub fn unset_port(window: Window, state: State<AppState>) -> Result<(), String> {
    let res = state.unset_port().or_else(|err| Err(format!("{}", err)));
    if let Ok(_) = res {
        println!("midi-port-updated");
        let _ = window.emit("midi-port-updated", ());
    }
    res
}

#[command(rename_all = "snake_case")]
pub fn has_active_port(state: State<AppState>) -> Result<bool, String> {
    state
        .has_active_port()
        .or_else(|err| Err(format!("{}", err)))
}
