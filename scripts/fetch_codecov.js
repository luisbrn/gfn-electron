// Example script to fetch per-file Codecov report for a repository/branch.
// This script requires a Codecov token with permission to read the report.
// Usage (example):
// CODECOV_TOKEN=xxx node scripts/fetch_codecov.js luisbrn gfn-electron steam-rpc-feature

const https = require('https');
const [owner, repo, branch] = process.argv.slice(2);
const token = process.env.CODECOV_TOKEN;

if (!owner || !repo || !branch) {
  console.error('Usage: node scripts/fetch_codecov.js <owner> <repo> <branch>');
  process.exit(2);
}
if (!token) {
  console.error('Set CODECOV_TOKEN environment variable');
  process.exit(3);
}

const options = {
  hostname: 'codecov.io',
  path: `/api/gh/${owner}/${repo}/branch/${encodeURIComponent(branch)}`,
  headers: { Authorization: `token ${token}` },
  method: 'GET',
};

https
  .get(options, res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.error('Failed to parse response:', e.message);
        console.error(data);
      }
    });
  })
  .on('error', err => {
    console.error('Request error:', err.message);
  });
