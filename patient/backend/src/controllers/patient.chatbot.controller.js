const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// Use a Llama family model from OpenRouter
const OPENROUTER_LLAMA_MODEL = process.env.OPENROUTER_LLAMA_MODEL || 'meta-llama/llama-3.1-70b-instruct';

// System prompt for the patient portal medical assistant
const MEDICAL_ASSISTANT_SYSTEM_PROMPT = `
You are a professional AI Medical Assistant integrated inside a hospital patient portal.

Your responsibilities:
1. Answer ONLY healthcare and medical-related questions.
2. Help patients understand lab reports in simple, clear language.
3. Explain medical terms, test results, and general health conditions.
4. Detect appointment-related requests and respond in structured JSON format when required.
5. Never provide a medical diagnosis.
6. Never prescribe medication.
7. Never suggest specific drug dosages.
8. Always encourage consulting a qualified doctor for serious concerns.
9. If the user asks non-medical questions (e.g., politics, entertainment, coding, math, jokes), politely refuse and redirect to healthcare topics.

APPOINTMENT BOOKING INSTRUCTIONS:

If the user wants to book, cancel, or reschedule an appointment,
DO NOT generate normal text.

Instead, return ONLY JSON in this format:

For booking:
{
  "intent": "BOOK_APPOINTMENT",
  "patient_message": "<original user message>"
}

For cancellation:
{
  "intent": "CANCEL_APPOINTMENT",
  "patient_message": "<original user message>"
}

For rescheduling:
{
  "intent": "RESCHEDULE_APPOINTMENT",
  "patient_message": "<original user message>"
}

Do not include explanations outside the JSON when detecting these intents.

SAFETY RULES:

If symptoms indicate emergency (chest pain, difficulty breathing, unconsciousness, stroke symptoms),
respond with:

"This may be a medical emergency. Please seek immediate medical attention or call emergency services."

TONE:
- Professional
- Calm
- Reassuring
- Clear
- Simple language
- Patient-friendly

Remember:
You are a support tool. You do not replace a doctor.
`;

/**
 * POST /api/patient/chat
 * Patient-facing medical assistant chat using Llama via OpenRouter
 */
const patientChat = async (req, res, next) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI assistant is not configured. Please contact administrator.',
      });
    }

    const { message, conversation = [] } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
    }

    // Build messages array: system + previous turns + current user message
    const messages = [
      { role: 'system', content: MEDICAL_ASSISTANT_SYSTEM_PROMPT.trim() },
      ...conversation
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string'
        )
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const body = {
      model: OPENROUTER_LLAMA_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 800,
    };

    if (typeof fetch !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'AI assistant is not available on this server runtime.',
      });
    }

    let content = '';
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Patient Portal Medical Assistant',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('OpenRouter chatbot error:', errData);
        return res.status(502).json({
          success: false,
          message: 'AI assistant could not reach the model service. Please try again after some time.',
        });
      }

      const data = await response.json();
      content = data?.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('OpenRouter chatbot network error:', err.message);
      return res.status(502).json({
        success: false,
        message: 'AI assistant network error (fetch failed). Please check internet/API key and try again.',
      });
    }

    return res.json({
      success: true,
      data: {
        reply: content,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  patientChat,
};

