const COMMANDER_PRINTED_NAME_ALIASES = [
  ['Eleven, the Mage', 'Cecily, Haunted Mage'],
  ['Chief Jim Hopper', 'Sophina, Spearsage Deserter'],
  ['Dustin, Gadget Genius', 'Hargilde, Kindly Runechanter'],
  ['Lucas, the Sharpshooter', 'Bjorna, Nightfall Alchemist'],
  ['Max, the Daredevil', 'Elmar, Ulvenwald Informant'],
  ['Mike, the Dungeon Master', 'Othelm, Sigardian Outcast'],
  ['Will the Wise', "Wernog, Rider's Chaplain"],
] as const;

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

/** Adds canonical Scryfall names for mechanically identical printed-name cards. */
export function buildCommanderNameSearchClause(query: string): string {
  const normalizedQuery = normalizeSearchText(query);
  const clauses = [`(${query} or name:"${query}")`];

  if (normalizedQuery.length >= 2) {
    for (const [printedName, canonicalName] of COMMANDER_PRINTED_NAME_ALIASES) {
      if (normalizeSearchText(printedName).includes(normalizedQuery)) {
        clauses.push(`name:"${canonicalName}"`);
      }
    }
  }

  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`;
}
