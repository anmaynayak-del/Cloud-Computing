/**
 * Helper to safely load and interact with Google Gemini API on the backend.
 * Supports multiple API keys with automatic failover and key rotation.
 * Never prints, logs, or exposes the API key.
 */

export function getGeminiApiKeys(): string[] {
  const rawKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEYS,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean);

  const keys: string[] = [];
  for (const raw of rawKeys) {
    if (typeof raw === 'string') {
      const parts = raw.split(',').map(k => k.trim()).filter(k => k && k !== 'PASTE_YOUR_KEY_HERE');
      keys.push(...parts);
    }
  }

  // Deduplicate keys
  return Array.from(new Set(keys));
}

export function getGeminiApiKey(): { apiKey: string } | { error: string; status: number } {
  const keys = getGeminiApiKeys();

  if (keys.length === 0) {
    return {
      error: 'Gemini API key is missing or still set to the placeholder. Please configure GEMINI_API_KEY in server/.env',
      status: 500,
    };
  }

  return { apiKey: keys[0] };
}

const FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

/**
 * Call Gemini API with automatic multi-key rotation and model fallback.
 * If one key gets exhausted (HTTP 429 or 403), it seamlessly switches to the next key.
 */
export async function generateGeminiContent(prompt: string, systemInstruction?: string): Promise<string> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error('Gemini API key is missing. Please configure GEMINI_API_KEY in server/.env');
  }

  let lastError: Error | null = null;

  // Try each API key in the pool (seamless failover)
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const currentKey = keys[keyIndex];

    for (const model of FALLBACK_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
        const body: any = {
          contents: [{ parts: [{ text: prompt }] }],
        };

        if (systemInstruction) {
          body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          // If 429 (rate/quota exhausted) or 403 (quota error)
          if (res.status === 429 || res.status === 403) {
            lastError = new Error(data?.error?.message || `Key #${keyIndex + 1} exhausted (${res.status})`);
            console.warn(`Gemini Key #${keyIndex + 1} reached limit (${res.status}). Switching to next key...`);
            // Break from models loop to jump to the next API key in the pool
            break;
          }

          // If 503 (model temporary high demand), try next model on same key
          if (res.status === 503) {
            lastError = new Error(data?.error?.message || `Model ${model} high demand (${res.status})`);
            continue;
          }

          throw new Error(data?.error?.message || `Gemini API returned status ${res.status}`);
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error('Failed to generate response from Gemini API across all configured keys');
}
