// MIDI functions

// References:
// - http://www.midikits.net/midi_info.htm

import { Parser } from './parser.js';

export function Midi() {
}

Midi.Grammar = {

  Message: () => return { expectOr: [
    this.ChannelVoiceMessage,
    this.ChannelModeMessage,
    this.SystemMessage
  ]},

  ChannelVoiceMessage: () => return { expectOr: [
    this.NoteOnEvent,
    this.NoteOffEvent,
    this.PolyphonicKeyPressure,
    this.ControlChange,
    this.ProgramChange,
    this.ChannelPressure,
    this.PitchBend
  ]},

  ChannelModeMessage: () => return { expectOr: [
    this.LocalControlOff,
    this.LocalControlOn,
    this.AllNotesOff,
    this.OmniModeOff,
    this.OmniModeOn,
    this.MonoModeOn,
    this.PolyModeOn
  ]},

  SystemMessage: () => return { expectOr: [
    this.SystemCommonMessage,
    this.SystemRealTimeMessage,
    this.SystemExclusiveMessage
  ]},

  SystemCommonMessage: () => return { expectOr: [
    this.BeginSystemExclusive,
    this.MidiTimeCode,
    this.SongPositionPointer,
    this.SongSelect,
    this.TuneRequest,
    this.EndSystemExclusive
  ]},

  SystemRealTimeMessage: () => return { expectOr: [
    this.TimingClock,
    this.Start,
    this.Continue,
    this.Stop,
    this.ActiveSensing,
    this.SystemReset
  ]},

  NoteOnEvent: () => return { expectAnd: [
    this.expectBitmask([
      { mask: 0b11110000, expect: 0b10010000 },
      { mask: 0b00001111, run: (value) => { this.setNoteChannel(value); } }
    ]),

    this.expectOrSystemRealTimeMessage(this.expectBitmask(
      { mask: 0b10000000, expect: 0b10000000 },
      { mask: 0b01111111, run: (value) => { this.setNoteKey(value); } }
    )),

    this.expectOrSystemRealTimeMessage(this.expectBitmask(
      { mask: 0b10000000, expect: 0b10000000 },
      { mask: 0b01111111, run: (value) => { this.setNoteVelocity(value); } }
    )),
  ]},

  expectBitmask: (bitmask) => {
  }

  expectOrSystemRealTimeMessage: (rule) => {
    return () => return { expectOr: [
      rule,
      SystemRealTimeMessage
    ]};
  }
}
