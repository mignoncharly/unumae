#!/usr/bin/env node

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.RELEASE_SHA;

if (!token || !repository || !/^[0-9a-f]{40}$/i.test(sha ?? '')) {
  console.error(
    'GITHUB_TOKEN, GITHUB_REPOSITORY, and a full RELEASE_SHA are required.'
  );
  process.exit(1);
}

const response = await fetch(
  `https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${sha}&status=completed&per_page=20`,
  {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  }
);

if (!response.ok) {
  console.error(`Could not verify CI provenance (HTTP ${response.status}).`);
  process.exit(1);
}

const payload = await response.json();
const passed = payload.workflow_runs?.some(
  (run) => run.head_sha === sha && run.conclusion === 'success'
);
if (!passed) {
  console.error(
    `Commit ${sha.slice(0, 12)} has no successful completed CI run.`
  );
  process.exit(1);
}

// A successful CI run on a feature branch is not a releasable hosted
// revision. The deployment and hosted-verification workflows both require an
// exact commit that is already reachable from the protected main branch.
const mainResponse = await fetch(
  `https://api.github.com/repos/${repository}/compare/main...${sha}`,
  {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  }
);

if (!mainResponse.ok) {
  console.error(
    `Could not verify main-branch reachability (HTTP ${mainResponse.status}).`
  );
  process.exit(1);
}

const comparison = await mainResponse.json();
if (!['behind', 'identical'].includes(comparison.status)) {
  console.error(`Commit ${sha.slice(0, 12)} is not reachable from main.`);
  process.exit(1);
}

console.log(`CI provenance verified for ${sha}.`);
