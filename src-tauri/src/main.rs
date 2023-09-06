// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

extern crate midir;
mod app_state;
mod ipc_backend;

use app_state::AppState;
use ipc_backend::{fetch_ports, has_active_port, send, set_port, unset_port};

fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            fetch_ports,
            set_port,
            unset_port,
            has_active_port,
            send
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
