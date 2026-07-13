import { spawnSync } from 'node:child_process';

const KEEP_PRODUCTION = 3;
const KEEP_TEST_PREVIEW = 3;
const TEST_PREVIEW_REF = 'TestDev';
const DRY_RUN = process.argv.includes('--dry-run');

function runVercel(args) {
  const result = spawnSync('vercel', args, {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `vercel ${args.join(' ')} failed`);
  }

  return result.stdout;
}

function parseDeploymentsOutput(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Could not parse vercel ls JSON output');
  }

  return JSON.parse(output.slice(start, end + 1));
}

function fetchAllDeployments() {
  const all = [];
  let next = null;

  while (true) {
    const args = ['ls', '--format', 'json', '--yes'];
    if (next) args.push('--next', String(next));

    const payload = parseDeploymentsOutput(runVercel(args));
    const batch = payload.deployments ?? [];
    if (batch.length === 0) break;

    all.push(...batch);
    const oldest = batch[batch.length - 1];
    const oldestCreatedAt = oldest?.createdAt;
    if (!oldestCreatedAt || batch.length < 20) break;
    next = oldestCreatedAt;
  }

  return all;
}

function getDeploymentRef(deployment) {
  return deployment.meta?.githubCommitRef ?? null;
}

function isTestPreviewDeployment(deployment) {
  return deployment.target !== 'production' && getDeploymentRef(deployment) === TEST_PREVIEW_REF;
}

function removeDeployments(urls) {
  if (urls.length === 0) return;

  let removed = 0;
  let skipped = 0;

  for (const url of urls) {
    if (DRY_RUN) {
      console.log(`[dry-run] would remove ${url}`);
      continue;
    }

    let result = spawnSync('vercel', ['remove', url, '--safe', '--yes'], {
      encoding: 'utf8',
      shell: true,
      windowsHide: true,
    });

    if (result.status !== 0) {
      result = spawnSync('vercel', ['remove', url, '--yes'], {
        encoding: 'utf8',
        shell: true,
        windowsHide: true,
      });
    }

    if (result.status === 0) {
      removed += 1;
      console.log(`removed ${url}`);
      continue;
    }

    skipped += 1;
    const message = (result.stderr || result.stdout || '').trim();
    console.log(`skip ${url}${message ? `: ${message.split('\n').pop()}` : ''}`);
  }

  if (!DRY_RUN) {
    console.log(`Removed ${removed}, skipped ${skipped}.`);
  }
}

const deployments = fetchAllDeployments();

const production = deployments
  .filter((deployment) => deployment.target === 'production')
  .sort((a, b) => b.createdAt - a.createdAt);

const testPreview = deployments
  .filter(isTestPreviewDeployment)
  .sort((a, b) => b.createdAt - a.createdAt);

const keepUrls = new Set([
  ...production.slice(0, KEEP_PRODUCTION).map((deployment) => deployment.url),
  ...testPreview.slice(0, KEEP_TEST_PREVIEW).map((deployment) => deployment.url),
]);

const toDelete = deployments.filter((deployment) => !keepUrls.has(deployment.url));

console.log(`Found ${deployments.length} deployments total`);
console.log(`Production: keep ${Math.min(KEEP_PRODUCTION, production.length)}, delete ${Math.max(0, production.length - KEEP_PRODUCTION)}`);
console.log(`Test preview (${TEST_PREVIEW_REF}): keep ${Math.min(KEEP_TEST_PREVIEW, testPreview.length)}, delete ${Math.max(0, testPreview.length - KEEP_TEST_PREVIEW)}`);
console.log(`Other previews/branches: delete ${toDelete.filter((deployment) => deployment.target !== 'production' && !isTestPreviewDeployment(deployment)).length}`);

if (toDelete.length === 0) {
  console.log('Nothing to prune.');
  process.exit(0);
}

console.log('\nKeeping production:');
production.slice(0, KEEP_PRODUCTION).forEach((deployment) => {
  console.log(`  - ${deployment.url} (${new Date(deployment.createdAt).toISOString()})`);
});

console.log(`\nKeeping test preview (${TEST_PREVIEW_REF}):`);
testPreview.slice(0, KEEP_TEST_PREVIEW).forEach((deployment) => {
  console.log(`  - ${deployment.url} (${new Date(deployment.createdAt).toISOString()})`);
});

console.log('\nDeleting:');
toDelete.forEach((deployment) => {
  const env = deployment.target === 'production'
    ? 'production'
    : `preview:${getDeploymentRef(deployment) ?? 'unknown'}`;
  console.log(`  - [${env}] ${deployment.url} (${new Date(deployment.createdAt).toISOString()})`);
});

removeDeployments(toDelete.map((deployment) => deployment.url));
console.log(DRY_RUN ? 'Dry run complete.' : 'Prune complete.');