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

// Map of @entente packages to their local paths
const ententePackages = {
  "@entente/consumer": "link:../../../entente/packages/consumer",
  "@entente/provider": "link:../../../entente/packages/provider",
  "@entente/fixtures": "link:../../../entente/packages/fixtures",
  "@entente/types": "link:../../../entente/packages/types",
  "@entente/metadata": "link:../../../entente/packages/metadata",
  "@entente/cli": "link:../../../entente/packages/cli",
};

function updatePackageJson(packagePath) {
  log(`📝 Updating ${packagePath}`, "blue");

  const content = readFileSync(packagePath, "utf8");
  const pkg = JSON.parse(content);
  let updated = false;

  // Update dependencies
  if (pkg.dependencies) {
    for (const [packageName, localPath] of Object.entries(ententePackages)) {
      if (pkg.dependencies[packageName]) {
        pkg.dependencies[packageName] = localPath;
        updated = true;
        log(`  ✓ ${packageName} → ${localPath}`, "green");
      }
    }
  }

  // Update devDependencies
  if (pkg.devDependencies) {
    for (const [packageName, localPath] of Object.entries(ententePackages)) {
      if (pkg.devDependencies[packageName]) {
        pkg.devDependencies[packageName] = localPath;
        updated = true;
        log(`  ✓ ${packageName} → ${localPath}`, "green");
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
  log("🔗 Switching @entente packages to local links...", "blue");

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
        `\n✅ Successfully linked ${totalUpdated} package(s) to local development versions`,
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
