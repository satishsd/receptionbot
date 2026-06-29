import { BotResponse, ConversationSession } from '../types';
import { recognizeIntent } from './intents/recognizer';
import { handleGreeting } from './handlers/greetingHandler';
import { handleBusinessHours } from './handlers/businessHoursHandler';
import { handleServicesInfo } from './handlers/servicesInfoHandler';
import { handleAppointmentBooking } from './handlers/appointmentHandler';
import { handleFallback } from './handlers/fallbackHandler';
import { messageRepository } from '../db/repositories/messageRepository';

/**
 * Core bot engine. Routes an incoming user message to the correct intent handler
 * and persists both user and bot messages to the database.
 */
export async function processMessage(
  session: ConversationSession,
  userText: string,
): Promise<BotResponse> {
  // Persist user message
  await messageRepository.create(session.id, 'USER', userText);

  // Increment turn count
  session.context.turnCount++;

  // If we are mid-flow (appointment booking multi-turn), keep current intent
  let intent = session.state.currentIntent;

  // Advance booking flow based on current step
  if (intent === 'appointment_booking' && session.state.step) {
    // We're already in a booking flow — advance it
  } else {
    // Classify new intent from user message
    const result = recognizeIntent(userText);
    intent = result.intent;
    session.state.currentIntent = intent;
  }

  // Dispatch to intent handler
  let botMessage;
  switch (intent) {
    case 'greeting':
      botMessage = handleGreeting(session);
      break;
    case 'business_hours':
      botMessage = handleBusinessHours(session);
      break;
    case 'services_info':
      botMessage = handleServicesInfo(session);
      break;
    case 'appointment_booking':
      botMessage = await handleAppointmentBooking(session, userText);
      // Advance step for next turn
      advanceBookingStep(session);
      break;
    default:
      botMessage = handleFallback(session, userText);
  }

  // Persist bot response
  await messageRepository.create(
    session.id,
    'BOT',
    botMessage.text,
    botMessage.intent,
    botMessage.metadata
      ? (botMessage.metadata as import('@prisma/client').Prisma.InputJsonValue)
      : undefined,
  );

  return {
    sessionId: session.id,
    message: botMessage,
    timestamp: new Date(),
  };
}

/**
 * Advance the appointment booking step machine after the handler has returned a response.
 *
 * Flow: The handler reads `session.state.step` to decide what prompt to show the user,
 * then THIS function moves the step forward for the *next* user turn.
 *
 * Step sequence (what the bot asks at each step):
 *   undefined  → handler shows "start/ask_name" prompt, advance to ask_service
 *   ask_name   → handler shows "ask_name" prompt,  advance to ask_service
 *   ask_service → handler collects name, shows service menu, advance to ask_contact
 *   ask_contact → handler collects service, asks for email/phone, advance to ask_datetime
 *   ask_datetime → handler collects contact, asks preferred time, advance to confirm
 *   confirm     → handler collects datetime, shows summary + yes/no, advance to done
 *   done        → handler processes confirmation/cancellation, clears state
 *
 * When step is undefined: the handler just showed the initial "ask_name" prompt,
 * so we move to ask_service (ready to receive the name on the next turn).
 */
function advanceBookingStep(session: ConversationSession): void {
  const stepOrder = ['ask_name', 'ask_service', 'ask_contact', 'ask_datetime', 'confirm', 'done'];
  const current = session.state.step;

  if (!current) {
    // Handler just showed the initial ask_name prompt; next turn collects the name
    session.state.step = 'ask_service';
    return;
  }

  const idx = stepOrder.indexOf(current);
  if (idx >= 0 && idx < stepOrder.length - 1) {
    session.state.step = stepOrder[idx + 1];
  } else if (current === 'done') {
    // Booking complete — clear state
    session.state.step = undefined;
    session.state.currentIntent = undefined;
    session.state.pendingData = undefined;
  }
}
