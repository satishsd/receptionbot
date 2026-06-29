import { BotMessage, ConversationSession } from '../../types';

export function handleBusinessHours(_session: ConversationSession): BotMessage {
  return {
    text: '🕐 Our business hours are:\n\n• Monday – Friday: 9:00 AM – 6:00 PM\n• Saturday: 10:00 AM – 4:00 PM\n• Sunday: Closed\n\nWe are closed on public holidays. Would you like to book an appointment or learn about our services?',
    intent: 'business_hours',
    confidence: 1.0,
    quickReplies: ['Book Appointment', 'Our Services', 'Main Menu'],
  };
}
