const fs = require('fs');
const path = require('path');

// Simple updater: replace the line that mentions branch coverage with the provided percentage
// Usage: node scripts/update_readme_coverage.js 59.80

const percent = process.argv[2];
if (!percent) {
  console.error('Usage: node scripts/update_readme_coverage.js <percent>');
  process.exit(2);
}

const readmePath = path.join(__dirname, '..', 'README.md');
let content = fs.readFileSync(readmePath, 'utf8');

const re = /(Branch coverage \(steam-rpc-feature\): \*\*)([0-9]+\.?[0-9]*)(%?)(\*\*)/m;
if (re.test(content)) {
  content = content.replace(re, `$1${percent}$3$4`);
  fs.writeFileSync(readmePath, content, 'utf8');
  console.log('README updated with coverage:', percent);
} else {
  console.error('Could not find coverage line in README to update');
  process.exit(3);
}
