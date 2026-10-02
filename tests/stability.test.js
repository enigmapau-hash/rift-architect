import test from 'node:test';
import assert from 'node:assert/strict';

import { createDraftState, loadDraft, restoreDraftFromState } from '../js/core/draft-state.js';
import { parseSheet } from '../js/core/workbook.js';

function withMockWindow(xlsx, fn) {
  const originalWindow = globalThis.window;
  globalThis.window = { XLSX: xlsx };

  try {
    return fn();
  } finally {
    globalThis.window = originalWindow;
  }
}

test('restores saved draft selections after reload', () => {
  const storage = {
    getItem(key) {
      assert.equal(key, 'rift-architect:draft-v2');
      return JSON.stringify({
        activeRole: 'mid',
        selected: {
          top: 'Ornn',
          jungle: 'Sejuani',
          mid: 'Syndra',
          botline: 'Jinx',
          support: 'Lulu',
        },
      });
    },
  };

  const state = createDraftState();
  state.data = {
    top: [{ champion: 'Ornn', identity: 'Engage', function: 'Frontline', tempo: 'Early' }],
    jungle: [{ champion: 'Sejuani', identity: 'Engage', function: 'Frontline', tempo: 'Early' }],
    mid: [{ champion: 'Syndra', identity: 'Burst', function: 'Mage', tempo: 'Mid' }],
    botline: [{ champion: 'Jinx', identity: 'Scaling', function: 'Carry', tempo: 'Late' }],
    support: [{ champion: 'Lulu', identity: 'Protect', function: 'Enchanter', tempo: 'Mid' }],
  };

  const restored = restoreDraftFromState(state, loadDraft(storage));

  assert.equal(restored, true);
  assert.equal(state.activeRole, 'mid');
  assert.equal(state.selected.top.champion, 'Ornn');
  assert.equal(state.selected.jungle.champion, 'Sejuani');
  assert.equal(state.selected.mid.champion, 'Syndra');
  assert.equal(state.selected.botline.champion, 'Jinx');
  assert.equal(state.selected.support.champion, 'Lulu');
  assert.equal(state.savedDraft.selected.mid, 'Syndra');
});

test('restores only champions that still exist in the current dataset', () => {
  const storage = {
    getItem() {
      return JSON.stringify({
        activeRole: 'support',
        selected: {
          top: 'Ornn',
          jungle: 'Missing Jungle',
          mid: 'Syndra',
        },
      });
    },
  };

  const state = createDraftState();
  state.data = {
    top: [{ champion: 'Ornn' }],
    jungle: [{ champion: 'Viego' }],
    mid: [{ champion: 'Syndra' }],
    botline: [],
    support: [],
  };

  const restored = restoreDraftFromState(state, loadDraft(storage));

  assert.equal(restored, true);
  assert.equal(state.activeRole, 'support');
  assert.equal(state.selected.top.champion, 'Ornn');
  assert.equal(state.selected.jungle, null);
  assert.equal(state.selected.mid.champion, 'Syndra');
  assert.equal(state.selected.botline, null);
  assert.equal(state.selected.support, null);
});

test('restoreDraftFromState matches normalized champion names and saved keys', () => {
  const storage = {
    getItem() {
      return JSON.stringify({
        activeRole: 'top',
        selected: {
          top: '  aAtRoX  ',
          jungle: ' amumu ',
          mid: ' ahri ',
          botline: ' ashe ',
          support: ' alistar ',
        },
        selectedKeys: {
          top: 'aatrox',
          jungle: 'amumu',
          mid: 'ahri',
          botline: 'ashe',
          support: 'alistar',
        },
      });
    },
  };

  const state = createDraftState();
  state.data = {
    top: [{ champion: 'Aatrox', championKey: 'aatrox' }],
    jungle: [{ champion: 'Amumu', championKey: 'amumu' }],
    mid: [{ champion: 'Ahri', championKey: 'ahri' }],
    botline: [{ champion: 'Ashe', championKey: 'ashe' }],
    support: [{ champion: 'Alistar', championKey: 'alistar' }],
  };

  const restored = restoreDraftFromState(state, loadDraft(storage));

  assert.equal(restored, true);
  assert.equal(state.selected.top.champion, 'Aatrox');
  assert.equal(state.selected.jungle.champion, 'Amumu');
  assert.equal(state.selected.mid.champion, 'Ahri');
  assert.equal(state.selected.botline.champion, 'Ashe');
  assert.equal(state.selected.support.champion, 'Alistar');
});

test('parseSheet accepts reordered translated headers', () => {
  const worksheet = { '!ref': 'A1:F2' };
  const mockXlsx = {
    utils: {
      sheet_to_json() {
        return [
          ['Nombre', 'Fortalezas', 'Ritmo', 'Debilidades', 'Identidad', 'Función'],
          ['Ahri', 'Pick · Burst', 'Mid', 'Punish · Squishy', 'Pick', 'Mage'],
        ];
      },
    },
  };

  const rows = withMockWindow(mockXlsx, () => parseSheet(worksheet));

  assert.deepEqual(rows, [
    {
      champion: 'Ahri',
      identity: 'Pick',
      function: 'Mage',
      tempo: 'Mid',
      strengths: ['Pick', 'Burst'],
      weaknesses: ['Punish', 'Squishy'],
    },
  ]);
});

test('parseSheet falls back to positional columns when headers are unknown', () => {
  const worksheet = { '!ref': 'A1:F2' };
  const mockXlsx = {
    utils: {
      sheet_to_json() {
        return [
          ['A', 'B', 'C', 'D', 'E', 'F'],
          ['Leona', 'Engage', 'Frontline', 'Early', 'Lockdown · Setup', 'Low range'],
        ];
      },
    },
  };

  const rows = withMockWindow(mockXlsx, () => parseSheet(worksheet));

  assert.deepEqual(rows, [
    {
      champion: 'Leona',
      identity: 'Engage',
      function: 'Frontline',
      tempo: 'Early',
      strengths: ['Lockdown', 'Setup'],
      weaknesses: ['Low range'],
    },
  ]);
});
