import { BotMessage, ConversationSession, AppointmentDraft } from '../../types';
import {
  appointmentRepository,
  CreateAppointmentData,
} from '../../db/repositories/appointmentRepository';

const SERVICES = [
  'General Consultation',
  'Technical Support',
  'Project Planning',
  'Follow-up Meeting',
];

export async function handleAppointmentBooking(
  session: ConversationSession,
  userText: string,
): Promise<BotMessage> {
  const step = session.state.step || 'start';
  const draft = session.state.pendingData || {};

  switch (step) {
    case 'start':
    case 'ask_name':
      session.state.step = 'ask_name';
      return {
        text: "Great! Let's get your appointment set up. 📅\n\nWhat is your full name?",
        intent: 'appointment_booking',
        confidence: 1.0,
      };

    case 'ask_service': {
      const name = userText.trim();
      if (!name || name.length < 2) {
        return {
          text: 'Please provide your full name (at least 2 characters).',
          intent: 'appointment_booking',
        };
      }
      draft.name = name;
      session.state.pendingData = draft;
      session.state.step = 'ask_service';
      return {
        text: `Nice to meet you, ${name}! 😊\n\nWhich service would you like to book?\n\n${SERVICES.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        intent: 'appointment_booking',
        confidence: 1.0,
        quickReplies: SERVICES,
      };
    }

    case 'ask_contact': {
      const service = resolveService(userText.trim());
      if (!service) {
        return {
          text: `Please select one of the available services:\n\n${SERVICES.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
          intent: 'appointment_booking',
          quickReplies: SERVICES,
        };
      }
      draft.service = service;
      session.state.pendingData = draft;
      session.state.step = 'ask_contact';
      return {
        text: 'Please provide your email address or phone number so we can confirm your appointment.',
        intent: 'appointment_booking',
        confidence: 1.0,
      };
    }

    case 'ask_datetime': {
      const contact = userText.trim();
      if (isEmail(contact)) {
        draft.email = contact;
      } else if (isPhone(contact)) {
        draft.phone = contact;
      } else {
        return {
          text: 'Please provide a valid email address (e.g. name@example.com) or phone number.',
          intent: 'appointment_booking',
        };
      }
      session.state.pendingData = draft;
      session.state.step = 'ask_datetime';
      return {
        text: 'What is your preferred date and time? (e.g. "Monday 2 PM", "July 15 at 10am")',
        intent: 'appointment_booking',
        confidence: 1.0,
      };
    }

    case 'confirm': {
      draft.preferredDate = userText.trim();
      session.state.pendingData = draft;
      session.state.step = 'confirm';
      return buildConfirmationMessage(draft);
    }

    case 'done': {
      const lower = userText.toLowerCase();
      if (lower.includes('yes') || lower.includes('confirm') || lower.includes('ok')) {
        return await saveAppointment(session, draft);
      } else if (lower.includes('no') || lower.includes('cancel')) {
        session.state.step = undefined;
        session.state.pendingData = undefined;
        session.state.currentIntent = undefined;
        return {
          text: 'No problem! Your appointment booking has been cancelled. Is there anything else I can help you with?',
          intent: 'appointment_booking',
          confidence: 1.0,
          quickReplies: ['Business Hours', 'Our Services', 'Start Over'],
        };
      } else {
        return buildConfirmationMessage(draft);
      }
    }

    default:
      session.state.step = 'ask_name';
      return {
        text: "Let's book an appointment. What is your full name?",
        intent: 'appointment_booking',
        confidence: 1.0,
      };
  }
}

function resolveService(input: string): string | null {
  const lower = input.toLowerCase();
  // Check by number
  const num = parseInt(input, 10);
  if (!isNaN(num) && num >= 1 && num <= SERVICES.length) {
    const service = SERVICES[num - 1];
    return service !== undefined ? service : null;
  }
  // Check by name match
  const match = SERVICES.find(
    (s) => s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase()),
  );
  return match || null;
}

function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isPhone(text: string): boolean {
  // Match digits, spaces, +, -, (, ) with total length 7-15
  return /^\+?[\d][\d\s\-().]{5,14}$/.test(text);
}

function buildConfirmationMessage(draft: Partial<AppointmentDraft>): BotMessage {
  const summary = [
    `👤 Name: ${draft.name || 'N/A'}`,
    `🛠 Service: ${draft.service || 'N/A'}`,
    draft.email ? `📧 Email: ${draft.email}` : '',
    draft.phone ? `📞 Phone: ${draft.phone}` : '',
    `📅 Preferred time: ${draft.preferredDate || 'N/A'}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    text: `Here's a summary of your appointment:\n\n${summary}\n\nShall I confirm this booking? (yes/no)`,
    intent: 'appointment_booking',
    confidence: 1.0,
    quickReplies: ['Yes, Confirm', 'No, Cancel'],
  };
}

async function saveAppointment(
  session: ConversationSession,
  draft: Partial<AppointmentDraft>,
): Promise<BotMessage> {
  try {
    const data: CreateAppointmentData = {
      sessionId: session.id,
      name: draft.name!,
      phone: draft.phone,
      email: draft.email,
      service: draft.service!,
      notes: draft.preferredDate ? `Preferred time: ${draft.preferredDate}` : undefined,
    };

    await appointmentRepository.create(data);

    // Reset state
    session.state.step = undefined;
    session.state.pendingData = undefined;
    session.state.currentIntent = undefined;

    return {
      text: `✅ Your appointment has been successfully booked!\n\nWe will contact you shortly to confirm the details. Is there anything else I can help you with?`,
      intent: 'appointment_booking',
      confidence: 1.0,
      metadata: { appointmentBooked: true },
      quickReplies: ['Business Hours', 'Our Services', 'Book Another'],
    };
  } catch {
    return {
      text: 'There was an issue saving your appointment. Please try again or contact us directly.',
      intent: 'appointment_booking',
      metadata: { error: true },
    };
  }
}
