export interface BotMessage {
  text: string;
  intent?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  quickReplies?: string[];
}

export interface UserMessage {
  text: string;
  sessionId: string;
}

export interface ConversationSession {
  id: string;
  channel: string;
  state: SessionState;
  context: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionState {
  currentIntent?: string;
  step?: string;
  pendingData?: Partial<AppointmentDraft>;
}

export interface ConversationContext {
  lastIntent?: string;
  turnCount: number;
}

export interface AppointmentDraft {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}

export interface BotResponse {
  sessionId: string;
  message: BotMessage;
  timestamp: Date;
}

export type IntentName =
  'greeting' | 'business_hours' | 'services_info' | 'appointment_booking' | 'fallback';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
