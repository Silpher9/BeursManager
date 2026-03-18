require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = process.env.PORT || 3001;

const RECEIPT_AUTH_TOKEN = process.env.RECEIPT_AUTH_TOKEN;
if (!RECEIPT_AUTH_TOKEN) {
  console.error('RECEIPT_AUTH_TOKEN is niet geconfigureerd. Server stopt.');
  process.exit(1);
}

const anthropic = new Anthropic.default();

app.use(cors());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
});
app.use('/api/', limiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Alleen JPEG en PNG bestanden zijn toegestaan.'));
    }
  },
});

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authenticatie vereist.' });
  }

  const token = authHeader.slice(7);

  if (token !== RECEIPT_AUTH_TOKEN) {
    return res.status(403).json({ error: 'Ongeldig token.' });
  }

  next();
}

const RECEIPT_PROMPT = `Je bent een bonnetje-lezer. Analyseer deze foto van een kassabon/bonnetje.
Geef een JSON object terug met:
- "amount": het totaalbedrag (als string met punt als decimaal, bijv. "24.80"). Kies het eindbedrag/totaal, niet subtotaal of BTW.
- "description": korte omschrijving (winkelnaam + type aankoop, bijv. "Albert Heijn - boodschappen")
- "category": een van: "standhuur", "reiskosten", "verblijf", "materiaal_stand", "eten_drinken" (kies de best passende, of null als onduidelijk)

Antwoord ALLEEN met valid JSON, geen andere tekst.`;

const VALID_CATEGORIES = [
  'standhuur',
  'reiskosten',
  'verblijf',
  'materiaal_stand',
  'eten_drinken',
];

app.post(
  '/api/receipt/extract',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Geen afbeelding meegestuurd.' });
    }

    try {
      const base64Image = req.file.buffer.toString('base64');
      const mediaType = req.file.mimetype === 'image/png' ? 'image/png' : 'image/jpeg';

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: RECEIPT_PROMPT,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === 'text');

      if (!textBlock || textBlock.type !== 'text') {
        return res.status(500).json({ error: 'Geen tekst in API-response.' });
      }

      // Strip markdown code fences als het model die toevoegt
      const cleanedText = textBlock.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedText);

      const result = {
        amount: typeof parsed.amount === 'string' ? parsed.amount : null,
        description: typeof parsed.description === 'string' ? parsed.description : null,
        category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : null,
      };

      // Validate amount is numeric
      if (result.amount !== null) {
        const numericAmount = parseFloat(result.amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          result.amount = null;
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Receipt extraction failed:', error);

      if (error instanceof SyntaxError) {
        return res.status(500).json({ error: 'Kon bonnetje-data niet parsen.' });
      }

      res.status(500).json({ error: 'Interne serverfout bij verwerking.' });
    }
  }
);

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Bestand is te groot (max 10MB).' });
    }
    return res.status(400).json({ error: 'Upload fout.' });
  }

  if (err.message === 'Alleen JPEG en PNG bestanden zijn toegestaan.') {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Interne serverfout.' });
});

app.listen(port, () => {
  console.log(`Receipt-server draait op poort ${port}`);
});
