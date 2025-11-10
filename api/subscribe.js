const https = require('https');
const path = require('path');
const fs = require('fs/promises');

const PUBLICATION_ID =
  process.env.BEEHIIV_PUBLICATION_ID || 'pub_c9b8177c-2f58-4851-aef6-6cceae9f3743';

const endpointUrl = new URL(
  `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`
);

const apiKeyPath = path.resolve(__dirname, '..', 'api_key_beehiv');

let cachedApiKey;

async function readApiKey() {
  if (cachedApiKey) return cachedApiKey;

  const envKey = (process.env.BEEHIIV_API_KEY || '').trim();
  if (envKey) {
    cachedApiKey = envKey;
    return cachedApiKey;
  }

  try {
    const raw = await fs.readFile(apiKeyPath, 'utf8');
    const trimmed = raw.trim();

    if (!trimmed) {
      throw new Error('Beehiiv API key file is empty.');
    }

    cachedApiKey = trimmed;
  } catch (error) {
    throw new Error(
      'Beehiiv API key not found. Set BEEHIIV_API_KEY or provide api_key_beehiv (ignored by git).'
    );
  }

  return cachedApiKey;
}

function readStream(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function parseRequestBody(body) {
  if (!body) return undefined;

  if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      // If it's not JSON, ignore here (we may fall back to URLSearchParams elsewhere)
      return undefined;
    }
  }

  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function sendToBeehiiv(payload, apiKey) {
  const requestPayload = {
    email: payload.email,
    send_welcome_email: true,
    utm_source: 'self-mastery-vault',
  };

  if (payload.firstName) {
    requestPayload.first_name = payload.firstName;
  }

  const body = JSON.stringify(requestPayload);

  const requestOptions = {
    hostname: endpointUrl.hostname,
    path: endpointUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      Authorization: `Bearer ${apiKey}`,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode || 500,
          body: responseBody,
        });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let parsedBody = parseRequestBody(req.body);

  // If nothing parsed, try reading raw stream (for HTML form submits)
  if (!parsedBody && req.body === undefined && req.readable !== false) {
    try {
      const raw = await readStream(req);

      // Try JSON first
      parsedBody = parseRequestBody(raw);

      // If still nothing, assume x-www-form-urlencoded
      if (!parsedBody && typeof raw === 'string') {
        const params = new URLSearchParams(raw);
        parsedBody = {
          email: params.get('email') || '',
          firstName: params.get('firstName') || params.get('first_name') || '',
        };
      }
    } catch (streamErr) {
      console.error('Failed to parse request body:', streamErr);
    }
  }

  const email = (parsedBody?.email || req.query?.email || '').trim();
  const firstNameRaw =
    parsedBody?.firstName ||
    parsedBody?.first_name ||
    req.query?.firstName ||
    req.query?.first_name ||
    '';
  const firstName = firstNameRaw.trim();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const apiKey = await readApiKey();
    const beehiivResponse = await sendToBeehiiv(
      {
        email,
        firstName: firstName || undefined,
      },
      apiKey
    );

    let parsed;
    try {
      parsed = beehiivResponse.body ? JSON.parse(beehiivResponse.body) : {};
    } catch {
      parsed = { raw: beehiivResponse.body };
    }

    if (beehiivResponse.status < 200 || beehiivResponse.status >= 300) {
      console.error('Beehiiv error:', parsed);
      return res
        .status(beehiivResponse.status)
        .json({ error: parsed?.message || 'Failed to subscribe' });
    }

    // ✅ SUCCESS: redirect to success page
    res.writeHead(302, { Location: '/success.html' });
    return res.end();
  } catch (error) {
    console.error('Subscribe handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = handler;
module.exports.default = handler;

