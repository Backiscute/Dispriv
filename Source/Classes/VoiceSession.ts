import { RTCConnection } from "./RTCConnection";

export interface VoiceSession {
  guild_id: string;
  channel_id: string;
  voice_states: VoiceState[];
  ConnectedVoiceClients?: RTCConnection[];
}

export interface VoiceState {
  channel_id: string;
  deaf: boolean;
  guild_id: string;
  mute: boolean;
  request_to_speak_timestamp: string;
  self_deaf: boolean;
  self_mute: boolean;
  self_video: boolean;
  session_id: string;
  suppress: boolean;
  user_id: string;
  member: object;
}
