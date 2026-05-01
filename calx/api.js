/**
 * api.js — AI-powered food scanning via OpenAI / Gemini / Custom endpoints
 * Handles image encoding, API calls, and response parsing
 */

const FoodAPI = (() => {

  // ─── System Prompt ─────────────────────────────────────────────────────────

  const SYSTEM_PROMPT = `You are a nutrition analysis assistant. When given a food image, identify the food and estimate its nutritional content per serving.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "name": "Food name (be specific)",
  "servingSize": "e.g. 1 cup, 200g, 1 medium piece",
  "calories": 350,
  "protein": 25,
  "fat": 12,
  "carbs": 30,
  "confidence": "high|medium|low",
  "notes": "Optional: any relevant notes about portion estimation"
}

All macros are in grams. Calories are in kcal. Be realistic with portion sizes visible in the image.`;

  // ─── Image → Base64 ────────────────────────────────────────────────────────

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─── OpenAI ────────────────────────────────────────────────────────────────

  async function callOpenAI(apiKey, base64Image, mimeType, userPrompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return parseNutritionResponse(text);
  }

  // ─── Google Gemini ─────────────────────────────────────────────────────────

  async function callGemini(apiKey, base64Image, mimeType, userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT + '\n\n' + userPrompt },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.1 }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseNutritionResponse(text);
  }

  // ─── Custom Endpoint (OpenAI-compatible format) ────────────────────────────
  // Works with OpenRouter, Together AI, Groq, local Ollama, etc.

  async function callCustom(settings, base64Image, mimeType, userPrompt) {
    const model = settings.customModel || 'openai/gpt-4o'; // sensible default for OpenRouter

    const response = await fetch(settings.customEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
        // OpenRouter requires this header; harmless for other providers
        'HTTP-Referer': location.origin,
        'X-Title': 'CalorieLens',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Custom API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return parseNutritionResponse(text);
  }

  // ─── Response Parser ───────────────────────────────────────────────────────

  function parseNutritionResponse(text) {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    // Try to extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse nutrition data from API response.');

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and sanitize required fields
    const result = {
      name:        String(parsed.name || 'Unknown Food'),
      servingSize: String(parsed.servingSize || '1 serving'),
      calories:    Math.max(0, Math.round(Number(parsed.calories) || 0)),
      protein:     Math.max(0, Math.round(Number(parsed.protein)  || 0)),
      fat:         Math.max(0, Math.round(Number(parsed.fat)      || 0)),
      carbs:       Math.max(0, Math.round(Number(parsed.carbs)    || 0)),
      confidence:  ['high','medium','low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      notes:       String(parsed.notes || ''),
    };

    return result;
  }

  // ─── Main Scan Entry Point ─────────────────────────────────────────────────

  async function scanFood(file, context = '') {
    const settings = Storage.getApiSettings();

    if (!settings.apiKey && settings.provider !== 'custom') {
      throw new Error('No API key configured. Please add your API key in Settings.');
    }

    const mimeType    = file.type || 'image/jpeg';
    const base64Image = await fileToBase64(file);
    const userPrompt  = context
      ? `Analyse this food image. Additional context from the user: "${context}"`
      : 'Analyse this food image and provide nutritional estimates.';

    switch (settings.provider) {
      case 'openai':  return callOpenAI(settings.apiKey, base64Image, mimeType, userPrompt);
      case 'gemini':  return callGemini(settings.apiKey, base64Image, mimeType, userPrompt);
      case 'custom':  return callCustom(settings, base64Image, mimeType, userPrompt);
      default:        throw new Error(`Unknown provider: ${settings.provider}`);
    }
  }

  return { scanFood, parseNutritionResponse };
})();
