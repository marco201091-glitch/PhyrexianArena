export type TableRandomKind = 'coin' | 'd4' | 'd6' | 'd20';

function randomByte() {
  const values = new Uint8Array(1);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    return values[0];
  }
  return Math.floor(Math.random() * 256);
}

export function rollUniformDie(sides: 4 | 6 | 20) {
  const ceiling = Math.floor(256 / sides) * sides;
  let value = randomByte();
  while (value >= ceiling) value = randomByte();
  return (value % sides) + 1;
}

export function rollTableRandom(kind: TableRandomKind) {
  if (kind === 'coin') return randomByte() < 128 ? 'heads' : 'tails';
  return rollUniformDie(Number(kind.slice(1)) as 4 | 6 | 20);
}
