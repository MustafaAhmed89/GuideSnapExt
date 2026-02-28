/**
 * build-zip.mjs
 * Packages the dist/ folder into a Chrome Web Store upload ZIP.
 * Run via:  npm run zip
 */
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const OUT = `guidesnap-${pkg.version}.zip`;

if (existsSync(OUT)) {
  rmSync(OUT);
  console.log(`Removed old ${OUT}`);
}

// Compress-Archive on Windows; -Path dist\* puts files at the ZIP root (no dist/ subfolder)
execSync(
  `powershell -Command "Compress-Archive -Path dist\\* -DestinationPath ${OUT} -Force"`,
  { stdio: 'inherit' }
);

console.log(`\n✅  Created ${OUT}  — upload this file to the Chrome Web Store Developer Dashboard`);
