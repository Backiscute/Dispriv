import { RTCConnection } from "./RTCConnection";

export interface VoiceSession {
  guild_id: string;
  channel_id: string;
  voice_states: VoiceState[];
  ConnectedVoiceClients?: RTCConnection[];
  Activities: ActivityRoom[];
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

export interface ActivityRoom {
  channel_id: string;
  connections: ActivityUserConnection[];
  embedded_activity: EmbeddedActivity;
  guild_id: string;
  users: string[];
  update_code?: number;
}

export interface ActivityUserConnection {
  metadata: object;
  user_id: string;
}

export interface EmbeddedActivity {
  activity_id: string,
  application_id: string,
  assets: object[];
  created_at?: string;
  details?: string;
  name: string;
  secrets?: object;
  state?: string;
  timestamps?: object;
  type?: number;
}