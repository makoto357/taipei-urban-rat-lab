import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readText = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Firebase configuration references the repository rules and Emulator ports', async () => {
  const config = JSON.parse(await readText('firebase.json'));

  assert.equal(config.firestore.rules, 'firebase/firestore.rules');
  assert.equal(config.firestore.indexes, 'firebase/firestore.indexes.json');
  assert.equal(config.storage.rules, 'firebase/storage.rules');
  assert.equal(config.emulators.firestore.port, 8080);
  assert.equal(config.emulators.storage.port, 9199);
});

test('Firestore and Storage rules begin from a default-deny posture', async () => {
  const [firestoreRules, storageRules] = await Promise.all([
    readText('firebase/firestore.rules'),
    readText('firebase/storage.rules'),
  ]);

  assert.match(firestoreRules, /rules_version = '2';/);
  assert.match(firestoreRules, /allow read, write: if false;/);
  assert.match(storageRules, /allow read, write: if false;/);
});
