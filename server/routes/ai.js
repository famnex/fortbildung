const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const { Setting } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// Use memory storage so we can read file contents as Buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

/**
 * POST /api/ai/scan
 * Body (multipart/form-data):
 *   - files[]: one or more image/pdf files
 *   - url: optional URL to fetch and include as text context
 *
 * Returns: structured JSON matching CreateTrainingPage formData schema
 */
router.post('/scan', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    // Fetch Gemini API key from settings
    const settings = await Setting.findOne();
    const apiKey = settings && settings.gemini_api_key ? settings.gemini_api_key.trim() : '';

    if (!apiKey) {
      return res.status(400).json({
        detail: 'Kein Gemini API-Key konfiguriert. Bitte hinterlegen Sie diesen in den Admin-Einstellungen unter dem Reiter "Gemini".'
      });
    }

    const files = req.files || [];
    const url = req.body.url ? req.body.url.trim() : '';

    if (files.length === 0 && !url) {
      return res.status(400).json({ detail: 'Bitte mindestens eine Datei hochladen oder eine URL angeben.' });
    }

    // Build Gemini request parts
    const parts = [];

    // System instruction / prompt
    const systemPrompt = `Du bist ein Assistent, der Informationen aus Dokumenten und Webseiten extrahiert, um sie in ein Fortbildungs-Anmeldesystem einzutragen.

Extrahiere aus dem folgenden Inhalt alle verfügbaren Informationen und gib sie als reines JSON-Objekt (kein Markdown, kein Codeblock) zurück, das diesem Schema entspricht:

{
  "title": "Titel der Fortbildung (String)",
  "description": "Beschreibung der Fortbildung (String, mehrzeilig erlaubt)",
  "requirements": "Voraussetzungen oder Zielgruppe (String)",
  "materials": "Materialien oder Hinweise (String)",
  "location": "Veranstaltungsort (String)",
  "max_participants": 0,
  "registration_deadline": "YYYY-MM-DD oder leer",
  "type": "internal oder external",
  "external_link": "URL zur externen Anmeldung falls vorhanden (String)",
  "external_provider": "Anbieter/Veranstalter falls extern (String)",
  "costs": "Kosten/Preis als Text (String, z.B. '120 €' oder 'kostenlos')",
  "dates": [
    {
      "start_datetime": "YYYY-MM-DDTHH:MM",
      "end_datetime": "YYYY-MM-DDTHH:MM"
    }
  ]
}

Regeln:
- Falls ein Wert nicht ermittelt werden kann, setze ihn auf einen leeren String "" oder 0.
- Gib NUR das JSON zurück, kein erklärender Text, keine Markdown-Blöcke.
- Nutze das Format YYYY-MM-DDTHH:MM für Datumsangaben in 'dates'.
- Falls kein Datum gefunden wird, setze "dates" auf ein leeres Array [].
- Falls es eine externe Anmeldeseite gibt, setze type auf "external", ansonsten auf "internal".
- Bei max_participants: 0 bedeutet "unbekannt/nicht gesetzt".`;

    parts.push({ text: systemPrompt });

    // Add files as inline data parts
    for (const file of files) {
      const mimeType = file.mimetype;
      const base64Data = file.buffer.toString('base64');

      if (mimeType === 'application/pdf') {
        // Gemini supports PDFs as inline_data
        parts.push({
          inline_data: {
            mime_type: 'application/pdf',
            data: base64Data
          }
        });
      } else if (mimeType.startsWith('image/')) {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
      }
    }

    // Fetch URL content if provided
    if (url) {
      try {
        const fetchResponse = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Fortbildung-Scanner/1.0)'
          },
          responseType: 'text'
        });
        const htmlContent = fetchResponse.data;

        // Strip HTML tags for a cleaner text context
        const textContent = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 15000); // Limit to avoid token overflow

        parts.push({ text: `\n\nInhalt der URL (${url}):\n${textContent}` });
      } catch (urlError) {
        console.error('Error fetching URL:', urlError.message);
        parts.push({ text: `\n\nURL konnte nicht abgerufen werden: ${url}` });
      }
    }

    // Call Gemini API
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    // Extract text from Gemini response
    const candidates = geminiResponse.data.candidates;
    if (!candidates || candidates.length === 0) {
      return res.status(500).json({ detail: 'Keine Antwort von Gemini erhalten.' });
    }

    const rawText = candidates[0].content.parts[0].text.trim();

    // Parse JSON from response
    let extractedData;
    try {
      // Strip potential markdown code fences
      const jsonString = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing Gemini JSON response:', rawText);
      return res.status(500).json({
        detail: 'Gemini hat kein valides JSON zurückgegeben. Bitte versuchen Sie es erneut oder verwenden Sie andere Quelldaten.'
      });
    }

    // Ensure required fields exist with defaults
    const result = {
      title: extractedData.title || '',
      description: extractedData.description || '',
      requirements: extractedData.requirements || '',
      materials: extractedData.materials || '',
      location: extractedData.location || '',
      max_participants: parseInt(extractedData.max_participants) || 0,
      registration_deadline: extractedData.registration_deadline || '',
      type: extractedData.type === 'external' ? 'external' : 'internal',
      external_link: extractedData.external_link || '',
      external_provider: extractedData.external_provider || '',
      costs: extractedData.costs || '',
      dates: Array.isArray(extractedData.dates) ? extractedData.dates : []
    };

    res.json(result);
  } catch (error) {
    console.error('Error in AI scan:', error.response?.data || error.message);
    const detail = error.response?.data?.error?.message || 'Fehler beim Verarbeiten der Anfrage.';
    res.status(500).json({ detail });
  }
});

module.exports = router;
