const deckId = process.argv[2] || '9576428';

function extractEstimatedBracketFromHtml(html) {
  const compactText = html
    .replace(/<!--\s*-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');

  const estimatedMatch = compactText.match(/Est(?:imated)?\s+Bracket:\s*[^()]*\((\d+)\)/i);
  if (estimatedMatch?.[1]) return estimatedMatch[1];

  const bracketMatch = compactText.match(/\bBracket:\s*[^()]*\((\d+)\)/i);
  return bracketMatch?.[1] || null;
}

async function main() {
  const apiRes = await fetch(`https://archidekt.com/api/decks/${deckId}/`);
  if (!apiRes.ok) {
    console.error('API failed', apiRes.status);
    process.exit(1);
  }
  const api = await apiRes.json();

  const htmlRes = await fetch(`https://archidekt.com/decks/${deckId}/`);
  const html = htmlRes.ok ? await htmlRes.text() : '';

  const cards = api.cards || [];
  const isCmd = (card) =>
    card.isCommander === true ||
    [...(card.categories || []), ...(card.card?.categories || [])].some((c) =>
      String(c).toLowerCase().includes('commander')
    );
  const cmdCards = cards.filter(isCmd);

  console.log(JSON.stringify({
    deckId,
    name: api.name,
    owner: api.owner?.username,
    private: api.private,
    unlisted: api.unlisted,
    edhBracket: api.edhBracket,
    scrapedBracket: extractEstimatedBracketFromHtml(html),
    commanderCards: cmdCards.length,
    commandersField: api.commanders,
    firstCommanderCard: cmdCards[0]?.card?.oracleCard?.name,
    importWouldSucceed: apiRes.ok && cmdCards.length > 0,
    sourceUrl: `https://archidekt.com/decks/${deckId}`,
    sourceType: 'archidekt',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});