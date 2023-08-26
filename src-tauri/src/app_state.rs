use anyhow::{anyhow, Result};
use crossbeam_channel::{Receiver, Sender};
use midir::{MidiOutput, MidiOutputConnection, MidiOutputPort};
use std::{
    sync::{Arc, RwLock},
    thread,
};

pub struct MidiSender {
    pub name: String,
    pub sender: Sender<Vec<u8>>,
}

pub struct AppState {
    // active_port: Arc<RwLock<Option<MidiOutputPort>>>,
    active_port_sender: Arc<RwLock<Option<MidiSender>>>,
}

impl AppState {
    pub fn midi_output() -> MidiOutput {
        MidiOutput::new("valand-midi-out").expect("valand midi output creation failed")
    }

    pub fn new() -> Self {
        AppState {
            active_port_sender: Default::default(),
        }
    }

    pub fn ports_name(&self) -> Vec<Result<String, ()>> {
        let midi_out = AppState::midi_output();
        midi_out
            .ports()
            .iter()
            .map(|port| match midi_out.port_name(port) {
                Ok(name) => Ok(name),
                Err(_) => Err(()),
            })
            .collect::<Vec<_>>()
    }

    pub fn unset_port(&self) -> Result<()> {
        let mut sender_mutex = self
            .active_port_sender
            .write()
            .or(Err(anyhow!("failed gaining sender write lock")))?;

        *sender_mutex = None;

        Ok(())
    }

    pub fn set_port(&self, port_index: usize, port_name: String) -> Result<()> {
        let midi = AppState::midi_output();

        let (_, _, port) =
            filter_matching_port(&midi, &port_index, &port_name).ok_or(anyhow!("not found"))?;

        let mut sender_write_lock = self
            .active_port_sender
            .write()
            .or(Err(anyhow!("failed gaining sender write lock")))?;

        let (sender, receiver) = crossbeam_channel::unbounded::<Vec<u8>>();

        // to be moved
        let conn_out = midi.connect(&port, "midir-test")?;

        let _ = thread::spawn(move || {
            let mut conn_out = conn_out;
            start_pipe_midi_bytes(&mut conn_out, &receiver);
            conn_out.close();
        });

        *sender_write_lock = Some(MidiSender {
            name: port_name,
            sender,
        });

        Ok(())
    }

    pub fn has_active_port(&self) -> Result<bool> {
        let lock = self
            .active_port_sender
            .read()
            .or(Err(anyhow!("failed gaining sender write lock")))?;

        Ok((&*lock).is_some())
    }
}

fn start_pipe_midi_bytes(
    output_connection: &mut MidiOutputConnection,
    receiver: &Receiver<Vec<u8>>,
) -> () {
    while let Ok(bytes) = receiver.recv() {
        if let Err(err) = output_connection.send(bytes.as_slice()) {
            match err {
                midir::SendError::InvalidData(x) => {
                    eprintln!("send error invalid {}", x);
                }
                midir::SendError::Other(x) => {
                    eprintln!("send error other {}", x);
                    break;
                }
            }
        }
    }
}

fn filter_matching_port(
    midi: &MidiOutput,
    port_index: &usize,
    port_name: &String,
) -> Option<(usize, String, MidiOutputPort)> {
    midi.ports()
        .into_iter()
        .enumerate()
        .filter_map(|(index, port)| midi.port_name(&port).map(|name| (index, name, port)).ok())
        .find(|(index, name, _)| index == port_index && name == port_name)
}
