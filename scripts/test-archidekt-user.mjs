const username = process.argv[2] || 'MarcoAndre91';
const targetDeckId = process.argv[3] || '9576428';

const searchUrl = new URL('https://archidekt.com/api/decks/v3/');
searchUrl.searchParams.set('ownerUsername', username);
searchUrl.searchParams.set('deckFormat', '3');
searchUrl.searchParams.set('orderBy', '-updatedAt');
searchUrl.searchParams.set('pageSize', '80');

const data = await fetch(searchUrl).then((response) => response.json());
const publicDecks = (data.results || []).filter((deck) => deck.id && deck.private !== true);
const target = publicDecks.find((deck) => String(deck.id) === targetDeckId);

console.log({
  username,
  totalResults: (data.results || []).length,
  publicCount: publicDecks.length,
  targetFound: Boolean(target),
  target: target ? {
    id: target.id,
    name: target.name,
    private: target.private,
    edhBracket: target.edhBracket,
    keys: Object.keys(target),
  } : null,
});