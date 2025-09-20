#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// List of @entente packages to check
const ententePackages = [
  '@entente/consumer',
  '@entente/provider',
  '@entente/fixtures',
  '@entente/types',
  '@entente/cli'
];

function checkPackageJson(packagePath) {
  const content = readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(content);
  const localLinks = [];

  // Check dependencies
  if (pkg.dependencies) {
    for (const packageName of ententePackages) {
      const version = pkg.dependencies[packageName];
      if (version && (version.startsWith('file:') || version.startsWith('link:'))) {
        localLinks.push({ package: packageName, version, type: 'dependency' });
      }
    }
  }

  // Check devDependencies
  if (pkg.devDependencies) {
    for (const packageName of ententePackages) {
      const version = pkg.devDependencies[packageName];
      if (version && (version.startsWith('file:') || version.startsWith('link:'))) {
        localLinks.push({ package: packageName, version, type: 'devDependency' });
      }
    }
  }

  return localLinks;
}

function main() {
  log('🔍 Checking for local @entente package links...', 'blue');

  // Find all package.json files in examples subdirectories
  const packagePaths = globSync('examples/*/package.json', { cwd: rootDir });

  if (packagePaths.length === 0) {
    log('❌ No example packages found in examples/*/', 'red');
    process.exit(1);
  }

  let hasLocalLinks = false;
  const allLocalLinks = [];

  for (const relativePath of packagePaths) {
    const fullPath = join(rootDir, relativePath);
    const localLinks = checkPackageJson(fullPath);

    if (localLinks.length > 0) {
      hasLocalLinks = true;
      allLocalLinks.push({ path: relativePath, links: localLinks });
    }
  }

  if (hasLocalLinks) {
    log('\n❌ Local file links detected in the following packages:', 'red');

    for (const { path, links } of allLocalLinks) {
      log(`\n📦 ${path}:`, 'yellow');
      for (const { package: pkg, version, type } of links) {
        log(`  • ${pkg}: ${version} (${type})`, 'red');
      }
    }

    log('\n💡 To fix this, run:', 'blue');
    log('   pnpm link:latest', 'green');
    log('\n⚠️  Push blocked to prevent committing local development links.', 'yellow');

    process.exit(1);
  } else {
    log('✅ No local links found. Safe to push!', 'green');
    process.exit(0);
  }
}

main();