import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [buildCommand, buildArgs] = process.platform === 'win32'
  ? ['cmd.exe', ['/d', '/s', '/c', 'npm run build']]
  : ['npm', ['run', 'build']];
let aboutPage;

before(() => {
  execFileSync(buildCommand, buildArgs, { cwd: projectRoot, stdio: 'pipe' });
  aboutPage = readFileSync(path.join(projectRoot, 'dist', 'about', 'index.html'), 'utf8');
});

test('about page renders the portrait beside the opening copy on laptops', () => {
  assert.match(
    aboutPage,
    /class="manifesto-portrait manifesto-portrait--desktop[^\"]*"[^>]*>[\s\S]*?alt="The observant man"/,
  );
});

test('about page places the mobile portrait after the signatures', () => {
  const signature = aboutPage.indexOf('SIGNED');
  const portrait = aboutPage.indexOf('manifesto-portrait--mobile');

  assert.ok(signature >= 0, 'the signed manifesto should render');
  assert.ok(portrait > signature, 'the mobile portrait should follow the signatures');
});
