import { IntentResult, IntentName } from '../../types';

interface IntentPattern {
  intent: IntentName;
  patterns: RegExp[];
  weight: number;
}

const intentPatterns: IntentPattern[] = [
  {
    intent: 'greeting',
    patterns: [/\b(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|greetings|sup|yo)\b/i],
    weight: 1.0,
  },
  {
    intent: 'business_hours',
    patterns: [
      /\b(hours?|open|close|closing|schedule|when\s*(are|is|do)|working\s*hours?|office\s*hours?|timings?)\b/i,
    ],
    weight: 0.9,
  },
  {
    intent: 'services_info',
    patterns: [
      /\b(service|services|what\s*do\s*you\s*(do|offer|provide)|offer|offerings?|help\s*with|can\s*you|information|info|details)\b/i,
    ],
    weight: 0.85,
  },
  {
    intent: 'appointment_booking',
    patterns: [
      /\b(book|appointment|schedule|reserve|meeting|visit|consult|consultation|set\s*up|make\s*an?\s*(appointment|booking))\b/i,
    ],
    weight: 0.95,
  },
];

export function recognizeIntent(text: string): IntentResult {
  const lower = text.toLowerCase().trim();

  let bestMatch: IntentResult = {
    intent: 'fallback',
    confidence: 0,
  };

  for (const { intent, patterns, weight } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        const confidence = weight;
        if (confidence > bestMatch.confidence) {
          bestMatch = { intent, confidence };
        }
      }
    }
  }

  if (bestMatch.intent === 'fallback') {
    bestMatch.confidence = 1.0;
  }

  return bestMatch;
}
