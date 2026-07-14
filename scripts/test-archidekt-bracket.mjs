function extractBracketFromText(text) {
  const patterns = [
    /Est(?:imated)?\s+Bracket:\s*[^()]*\((\d+)\)/i,
    /\b(?:Upgraded|Core|Exhibition|Optimized)\s*\((\d+)\)/i,
    /\bBracket:\s*[^()]*\((\d+)\)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractEstimatedBracketFromHtml(html) {
  const rawMatch = extractBracketFromText(html);
  if (rawMatch) return rawMatch;

  const compactText = html
    .replace(/<!--\s*-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');

  return extractBracketFromText(compactText);
}

const deckId = process.argv[2] || '9576428';
const api = await fetch(`https://archidekt.com/api/decks/${deckId}/`).then((response) => response.json());
const html = await fetch(`https://archidekt.com/decks/${deckId}/`).then((response) => response.text());

console.log({
  deckId,
  name: api.name,
  edhBracket: api.edhBracket,
  scrapedBracket: extractEstimatedBracketFromHtml(html),
  commander: api.cards?.filter((card) => (card.categories || []).some((cat) => String(cat).toLowerCase().includes('commander')))?.[0]?.card?.oracleCard?.name,
});