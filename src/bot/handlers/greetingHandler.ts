import { BotMessage, ConversationSession } from '../../types';

export function handleGreeting(_session: ConversationSession): BotMessage {
  return {
    text: "Hello! 👋 Welcome to our office. I'm your virtual receptionist. I can help you with:\n\n• 🕐 Business hours\n• 📋 Our services\n• 📅 Book an appointment\n\nWhat can I help you with today?",
    intent: 'greeting',
    confidence: 1.0,
    quickReplies: ['Business Hours', 'Our Services', 'Book Appointment'],
  };
}
