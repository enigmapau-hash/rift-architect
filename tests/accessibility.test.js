import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..');

function readRepoFile(relativePath) {
  return readFileSync(resolve(REPO_ROOT, relativePath), 'utf8');
}

test('accessibility controller exposes keyboard and aria hooks', () => {
  const controller = readRepoFile('js/ui/composition-controller-a11y.js');

  assert.match(controller, /aria-haspopup/);
  assert.match(controller, /aria-controls/);
  assert.match(controller, /aria-expanded/);
  assert.match(controller, /aria-label/);
  assert.match(controller, /aria-live/);
  assert.match(controller, /Escape/);
  assert.match(controller, /Tab/);
  assert.match(controller, /ArrowDown/);
  assert.match(controller, /ArrowUp/);
  assert.match(controller, /Home/);
  assert.match(controller, /End/);
});

test('accessibility stylesheet improves focus and contrast', () => {
  const css = readRepoFile('css/analysis-a11y.css');

  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-contrast: more/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('final visual stylesheet is loaded by the entry page', () => {
  const html = readRepoFile('index.html');

  assert.match(html, /analysis-visual-finesse\.css/);
  assert.match(html, /analysis-a11y\.css/);
  assert.match(html, /site-bootstrap\.js\?v=112/);
});