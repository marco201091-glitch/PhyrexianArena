import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

async function main() {
  // Dynamic import via vitest/ts not available; inline minimal fetch logic
  const deckIds = process.argv.slice(2);
  const searchTerms = deckIds.length > 0 ? [] : ['Eirdu', 'Urabrask'];

  if (searchTerms.length > 0) {
    for (const term of searchTerms) {
      const searchUrl = `https://archidekt.com/api/decks/v3/?deckFormat=3&orderBy=-updatedAt&pageSize=20&search=${encodeURIComponent(term)}`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      for (const deck of data.results || []) {
        if (!deck.private && deck.id) deckIds.push(String(deck.id));
      }
    }
  }

  const uniqueIds = [...new Set(deckIds)].slice(0, 10);

  for (const deckId of uniqueIds) {
    const apiRes = await fetch(`https://archidekt.com/api/decks/${deckId}/`);
    if (!apiRes.ok) continue;
    const api = await apiRes.json();
    const cards = api.cards || [];
    const isCmd = (card) =>
      card.isCommander === true
      || [...(card.categories || []), ...(card.card?.categories || [])].some((c) =>
        String(c).toLowerCase().includes('commander'));
    const cmdCards = cards.filter(isCmd);

    console.log('\n===', deckId, api.name, '===');
    console.log('commanders field:', JSON.stringify(api.commanders));
    for (const [index, card] of cmdCards.entries()) {
      const oracle = card.card?.oracleCard;
      console.log(`cmd[${index}]`, {
        names: [
          oracle?.name,
          card.card?.displayName,
          card.card?.name,
          ...(oracle?.faces || []).map((face) => face.name),
        ].filter(Boolean),
        layout: oracle?.layout,
        faceCount: oracle?.faces?.length || 0,
        uid: card.card?.uid,
        edition: card.card?.edition?.editioncode,
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});