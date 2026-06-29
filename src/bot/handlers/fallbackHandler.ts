import { BotMessage, ConversationSession } from '../../types';

export function handleFallback(_session: ConversationSession, _userText: string): BotMessage {
  return {
    text: "I'm sorry, I didn't quite understand that. 🤔\n\nI can help you with:\n• 🕐 Business hours\n• 📋 Our services\n• 📅 Book an appointment\n\nCould you please rephrase your question or pick an option below?",
    intent: 'fallback',
    confidence: 1.0,
    quickReplies: ['Business Hours', 'Our Services', 'Book Appointment'],
  };
}
