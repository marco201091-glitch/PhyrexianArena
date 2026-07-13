const BASE_URL = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const CASES = [
  {
    label: 'Eirdu / Isilu',
    url: 'https://archidekt.com/decks/22733112',
    names: ['Eirdu, Carrier of Dawn', 'Isilu, Carrier of Twilight'],
  },
  {
    label: 'Urabrask DFC',
    url: 'https://archidekt.com/decks/9213662',
    names: null,
  },
];

async function getDemoAccessToken() {
  const response = await fetch(`${BASE_URL}/api/auth/demo-login`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`demo-login failed (${response.status})`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('demo-login response missing access_token');
  }

  return payload.access_token;
}

async function importDeck(accessToken, url) {
  const response = await fetch(`${BASE_URL}/api/deck-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `deck-import failed (${response.status})`);
  }

  return payload;
}

async function main() {
  console.log(`Verifying import images via ${BASE_URL}`);
  const accessToken = await getDemoAccessToken();

  for (const testCase of CASES) {
    const deck = await importDeck(accessToken, testCase.url);
    const options = Array.isArray(deck.commanderOptions) ? deck.commanderOptions : [];

    if (options.length < 2) {
      throw new Error(`${testCase.label}: expected at least 2 commander options, got ${options.length}`);
    }

    const imageUrls = options.map((option) => option.imageUrl).filter(Boolean);
    if (imageUrls.length < 2) {
      throw new Error(`${testCase.label}: missing commander image URLs`);
    }

    const distinctUrls = new Set(imageUrls);
    if (distinctUrls.size < 2) {
      throw new Error(`${testCase.label}: commander options share the same image URL`);
    }

    if (testCase.names) {
      for (const name of testCase.names) {
        const match = options.find((option) => option.name === name);
        if (!match?.imageUrl) {
          throw new Error(`${testCase.label}: missing image for ${name}`);
        }
      }
    }

    console.log(`OK ${testCase.label}: ${options.map((option) => option.name).join(' | ')}`);
    console.log(`   ${[...distinctUrls].join('\n   ')}`);
  }

  console.log('Import image verification passed.');
}

main().catch((error) => {
  console.error('Import image verification failed.');
  console.error(error);
  process.exit(1);
});