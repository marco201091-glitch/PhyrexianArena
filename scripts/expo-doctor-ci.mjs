// Gate CI per expo-doctor.
//
// expo-doctor confronta le versioni installate con quelle attese *adesso* da
// npm, e il suo controllo sulle versioni fallisce anche per una sola patch di
// differenza. Con SDK 57 in rilascio attivo questo rende la CI instabile: il
// 2026-09-15 expo@57.0.23 e' stato pubblicato un minuto e mezzo dopo il merge
// di una PR che aveva allineato le stesse dipendenze, rendendo rosso un branch
// gia' verde.
//
// Una patch dentro la stessa minor e' compatibile per definizione: bloccare un
// merge per quello non protegge da niente e insegna a ignorare il gate.
//
// Questo wrapper esegue expo-doctor per intero e lascia passare solo le
// differenze di patch. Qualunque altro controllo fallito, o uno scostamento di
// major/minor, resta un errore. L'output completo viene sempre stampato, cosi'
// il drift di patch resta visibile senza essere bloccante.

// spawnSync con shell: execFileSync('npx', ...) non trova npx su Windows, dove
// e' uno shim .cmd e non un eseguibile. Con shell il comando vale su entrambe
// le piattaforme.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MISMATCH_ROW = /^([@a-z0-9/_.-]+)\s+[~^]?(\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+)\s*$/i;
const VERSION_CHECK = 'Check that packages match versions required by installed Expo SDK';

function runDoctor() {
  // --from-file permette di riesaminare l'output di un fallimento gia' avvenuto
  // senza rieseguire expo-doctor (che richiede rete e un albero installato).
  // Serve anche a coprire entrambi i rami decisionali con fixture reali.
  const fromFileIndex = process.argv.indexOf('--from-file');
  if (fromFileIndex !== -1) {
    const path = process.argv[fromFileIndex + 1];
    if (!path) throw new Error('--from-file requires a path');
    return { output: readFileSync(path, 'utf8'), failed: true };
  }

  const result = spawnSync('npx expo-doctor', { shell: true, encoding: 'utf8' });
  return {
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    failed: result.status !== 0,
  };
}

const { output, failed } = runDoctor();
process.stdout.write(output);

if (!failed) process.exit(0);

const failedChecks = output
  .split(/\r?\n/)
  .filter((line) => line.trimStart().startsWith('✖'))
  .map((line) => line.replace(/^\s*✖\s*/, '').trim());

if (failedChecks.length !== 1 || failedChecks[0] !== VERSION_CHECK) {
  // Un controllo diverso dalle versioni: il fallimento e' reale.
  process.exit(1);
}

const mismatches = output
  .split(/\r?\n/)
  .map((line) => MISMATCH_ROW.exec(line))
  .filter(Boolean)
  .map(([, name, expected, found]) => ({ name, expected, found }));

if (mismatches.length === 0) {
  // Fallimento sulle versioni ma nessuna riga leggibile: il formato e'
  // cambiato, e non posso dimostrare che sia solo una patch.
  console.error('expo-doctor: impossibile leggere le differenze di versione, tratto come errore.');
  process.exit(1);
}

const significant = mismatches.filter(({ expected, found }) => {
  const [expectedMajor, expectedMinor] = expected.split('.');
  const [foundMajor, foundMinor] = found.split('.');
  return expectedMajor !== foundMajor || expectedMinor !== foundMinor;
});

if (significant.length > 0) {
  console.error('\nexpo-doctor: scostamenti oltre la patch, build non compatibili:');
  for (const { name, expected, found } of significant) {
    console.error(`  ${name}: atteso ${expected}, trovato ${found}`);
  }
  process.exit(1);
}

console.error(
  `\nexpo-doctor: ${mismatches.length} pacchetti indietro di una patch (${mismatches
    .map(({ name }) => name)
    .join(', ')}). Compatibili con SDK 57, non bloccante.`,
);
process.exit(0);
