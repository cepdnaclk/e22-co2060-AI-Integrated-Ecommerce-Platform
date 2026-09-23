const { execSync, spawnSync } = require('child_process');
const path = require('path');

const repoDir = 'd:\\AI-ML-REPO\\e22-co2060-AI-Integrated-Ecommerce-Platform';

console.log('=== Changing to repo directory ===');
console.log(`Directory: ${repoDir}\n`);

try {
  // Command 1: git log --oneline origin/dev_yuneth..HEAD
  console.log('=== Command 1: git log --oneline origin/dev_yuneth..HEAD ===');
  try {
    const log = execSync('git log --oneline origin/dev_yuneth..HEAD', {
      cwd: repoDir,
      encoding: 'utf-8'
    });
    console.log(log);
  } catch (e) {
    console.log(`Error: ${e.message}`);
    console.log(e.stdout ? e.stdout.toString() : '');
  }

  // Command 2: Find large objects
  console.log('\n=== Command 2: Finding large objects (git rev-list) ===');
  try {
    // First get the rev-list
    const revList = execSync('git rev-list --objects --all', {
      cwd: repoDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    // Process with cat-file
    const result = spawnSync('git', ['cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)'], {
      cwd: repoDir,
      input: revList,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    if (result.error) {
      console.log(`Error: ${result.error.message}`);
    } else {
      // Parse and sort by size
      const lines = result.stdout.split('\n').filter(l => l.trim());
      const objects = lines.map(line => {
        const parts = line.split(' ');
        return {
          type: parts[0],
          hash: parts[1],
          size: parseInt(parts[2]) || 0,
          rest: parts.slice(3).join(' ')
        };
      });

      // Sort by size descending
      objects.sort((a, b) => b.size - a.size);

      // Show top 20
      console.log('Top 20 largest objects:');
      console.log('Type      Size       Hash                                   Path');
      console.log('-'.repeat(80));
      objects.slice(0, 20).forEach(obj => {
        const sizeStr = obj.size.toString().padStart(10);
        const typeStr = obj.type.padEnd(10);
        console.log(`${typeStr} ${sizeStr} ${obj.hash} ${obj.rest}`);
      });
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }

  // Command 3: git diff-tree for specific commit
  console.log('\n=== Command 3: git diff-tree --no-commit-id -r d36bd8970f5f62fd4791d18cdf22061d9a975ccd ===');
  try {
    const diffTree = execSync('git diff-tree --no-commit-id -r d36bd8970f5f62fd4791d18cdf22061d9a975ccd', {
      cwd: repoDir,
      encoding: 'utf-8'
    });
    console.log(diffTree);
  } catch (e) {
    console.log(`Error: ${e.message}`);
    if (e.stdout) console.log(e.stdout.toString());
  }

} catch (err) {
  console.error('Fatal error:', err);
  process.exit(1);
}
