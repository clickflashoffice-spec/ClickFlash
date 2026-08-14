import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const studioSource = readFileSync(
  new URL('../src/app/index.tsx', import.meta.url),
  'utf8'
);

test('verified original is published to UI state before automatic editing starts', () => {
  const previewStateIndex = studioSource.indexOf('const lastVerifiedPreview = tether.lastVerifiedPreview;');
  const editorIndex = studioSource.indexOf('processPhoto(', previewStateIndex);

  assert.ok(previewStateIndex >= 0, 'Verified preview state must be populated.');
  assert.ok(editorIndex > previewStateIndex, 'Preview must be populated before the editor starts.');
});

test('original preview remains visible before the quick-edit comparison', () => {
  const originalIndex = studioSource.indexOf('LOCAL VERIFIED ORIGINAL');
  const editedIndex = studioSource.indexOf('QUICK EDIT · OUTBOX SAFE');

  assert.ok(originalIndex >= 0, 'Original preview label is required.');
  assert.ok(editedIndex > originalIndex, 'Original preview must render before the quick edit.');
});
