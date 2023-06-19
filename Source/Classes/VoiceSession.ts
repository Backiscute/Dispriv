export interface VoiceSession {
  guild_id: string;
  channel_id: string;
  voice_states: VoiceState[];
}

export interface VoiceState {
  channel_id: string | null;
  deaf: boolean;
  guild_id: string;
  mute: boolean;
  request_to_speak_timestamp: string | null;
  self_deaf: boolean;
  self_mute: boolean;
  self_video: boolean;
  session_id: string;
  suppress: boolean;
  user_id: string;
  member: object;
}
