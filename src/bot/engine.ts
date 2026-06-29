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
 * The handler reads `session.state.step` to decide what to do, then this function
 * moves the step forward for the *next* user turn.
 */
function advanceBookingStep(session: ConversationSession): void {
  const stepOrder = ['ask_name', 'ask_service', 'ask_contact', 'ask_datetime', 'confirm', 'done'];
  const current = session.state.step;

  if (!current) {
    session.state.step = 'ask_service'; // after the initial "ask_name" response
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
