#![allow(dead_code, clippy::disallowed_names)]

use midi_msg::{self};
use serde::Serialize;
use ts_rs::TS;

#[derive(Serialize, TS)]
#[ts(export, export_to = "bindings/UserRole.ts")]
struct Role(u8);
