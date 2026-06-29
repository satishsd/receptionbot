import { config } from '../../config';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

function bearerToken(): string {
  return 'Bearer ' + config.whatsappAccessToken;
}

/**
 * Send a plain text message via WhatsApp Cloud API.
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const url = GRAPH_API_BASE + '/' + config.whatsappPhoneNumberId + '/messages';

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: bearerToken(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('WhatsApp API error (' + response.status + '): ' + errorText);
  }
}

/**
 * Mark an incoming message as read.
 */
export async function markMessageRead(messageId: string): Promise<void> {
  const url = GRAPH_API_BASE + '/' + config.whatsappPhoneNumberId + '/messages';

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: bearerToken(),
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  }).catch(() => {
    // Non-critical – ignore errors when marking read
  });
}
