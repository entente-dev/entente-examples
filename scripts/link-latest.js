#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { globSync } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// ANSI color codes for console output
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Map of @entente packages to their latest versions
const ententePackages = [
  "@entente/consumer",
  "@entente/provider",
  "@entente/fixtures",
  "@entente/metadata",
  "@entente/types",
  "@entente/cli",
];

function getLatestVersion(packageName) {
  try {
    // Try to get the latest version from npm
    const result = execSync(`npm view ${packageName} version`, {
      encoding: "utf8",
      stdio: "pipe",
    });
    return `^${result.trim()}`;
  } catch (error) {
    // Fallback to current version if npm view fails
    log(
      `  ⚠️  Could not fetch latest version for ${packageName}, using ^0.1.11`,
      "yellow",
    );
    return "^0.1.11";
  }
}

function updatePackageJson(packagePath) {
  log(`📝 Updating ${packagePath}`, "blue");

  const content = readFileSync(packagePath, "utf8");
  const pkg = JSON.parse(content);
  let updated = false;

  // Update dependencies
  if (pkg.dependencies) {
    for (const packageName of ententePackages) {
      if (pkg.dependencies[packageName]) {
        const latestVersion = getLatestVersion(packageName);
        pkg.dependencies[packageName] = latestVersion;
        updated = true;
        log(`  ✓ ${packageName} → ${latestVersion}`, "green");
      }
    }
  }

  // Update devDependencies
  if (pkg.devDependencies) {
    for (const packageName of ententePackages) {
      if (pkg.devDependencies[packageName]) {
        const latestVersion = getLatestVersion(packageName);
        pkg.devDependencies[packageName] = latestVersion;
        updated = true;
        log(`  ✓ ${packageName} → ${latestVersion}`, "green");
      }
    }
  }

  if (updated) {
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  } else {
    log(`  ⏭️  No @entente packages found`, "yellow");
  }

  return updated;
}

function main() {
  log("📦 Switching @entente packages to latest published versions...", "blue");

  // Find all package.json files in examples subdirectories
  const packagePaths = globSync("examples/*/package.json", { cwd: rootDir });

  if (packagePaths.length === 0) {
    log("❌ No example packages found in examples/*/", "red");
    process.exit(1);
  }

  let totalUpdated = 0;

  for (const relativePath of packagePaths) {
    const fullPath = join(rootDir, relativePath);
    if (updatePackageJson(fullPath)) {
      totalUpdated++;
    }
  }

  if (totalUpdated > 0) {
    log(`\n📦 Running pnpm install to apply changes...`, "blue");
    try {
      execSync("pnpm install", {
        cwd: rootDir,
        stdio: "inherit",
      });
      log(
        `\n✅ Successfully updated ${totalUpdated} package(s) to latest published versions`,
        "green",
      );
    } catch (error) {
      log(`\n❌ Failed to run pnpm install: ${error.message}`, "red");
      process.exit(1);
    }
  } else {
    log("\n⏭️  No packages needed updating", "yellow");
  }
}

main();
