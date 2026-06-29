import { BotMessage, ConversationSession } from '../../types';

export function handleServicesInfo(_session: ConversationSession): BotMessage {
  return {
    text: '📋 Here are the services we offer:\n\n1. **General Consultation** – Meet with our team for a 30-min introductory session\n2. **Technical Support** – Hands-on help with technical issues\n3. **Project Planning** – Strategic planning and roadmap sessions\n4. **Follow-up Meeting** – Scheduled check-ins for ongoing projects\n\nWould you like to book an appointment for any of these services?',
    intent: 'services_info',
    confidence: 1.0,
    quickReplies: ['Book General Consultation', 'Book Technical Support', 'Book Project Planning'],
  };
}
