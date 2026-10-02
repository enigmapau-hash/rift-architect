const STORAGE_KEYS = {
  a: 'rift-architect:comparison-a',
  b: 'rift-architect:comparison-b',
};

export function saveComparisonSnapshot(slot, selectedChampions = []) {
  const normalizedSlot = normalizeSlot(slot);
  const storageKey = STORAGE_KEYS[normalizedSlot];
  if (!storageKey) return null;

  const snapshot = {
    slot: normalizedSlot,
    label: normalizedSlot.toUpperCase(),
    savedAt: new Date().toISOString(),
    count: Array.isArray(selectedChampions) ? selectedChampions.length : 0,
    selectedChampions: cloneChampions(selectedChampions),
  };

  safeWrite(storageKey, snapshot);
  return snapshot;
}

export function loadComparisonSnapshot(slot) {
  const normalizedSlot = normalizeSlot(slot);
  const storageKey = STORAGE_KEYS[normalizedSlot];
  if (!storageKey) return null;

  const snapshot = safeRead(storageKey);
  return snapshot ? normalizeSnapshot(snapshot, normalizedSlot) : null;
}

export function loadComparisonSnapshots() {
  return {
    a: loadComparisonSnapshot('a'),
    b: loadComparisonSnapshot('b'),
  };
}

export function clearComparisonSnapshots() {
  safeRemove(STORAGE_KEYS.a);
  safeRemove(STORAGE_KEYS.b);
}

export function hasComparisonSnapshots() {
  const snapshots = loadComparisonSnapshots();
  return Boolean(snapshots.a || snapshots.b);
}

function normalizeSnapshot(snapshot, slot) {
  const selectedChampions = cloneChampions(snapshot.selectedChampions || []);
  return {
    slot: normalizeSlot(snapshot.slot || slot),
    label: String(snapshot.label || slot.toUpperCase()).trim() || slot.toUpperCase(),
    savedAt: String(snapshot.savedAt || snapshot.updatedAt || '').trim(),
    count: Number.isFinite(Number(snapshot.count)) ? Number(snapshot.count) : selectedChampions.length,
    selectedChampions,
  };
}

function cloneChampions(selectedChampions = []) {
  return (Array.isArray(selectedChampions) ? selectedChampions : [])
    .map((champion) => {
      if (!champion || typeof champion !== 'object') return null;

      return {
        role: String(champion.role || 'top'),
        champion: String(champion.champion || '').trim(),
        identity: String(champion.identity || '').trim(),
        function: String(champion.function || '').trim(),
        tempo: String(champion.tempo || '').trim(),
        strengths: Array.isArray(champion.strengths) ? [...champion.strengths] : [],
        weaknesses: Array.isArray(champion.weaknesses) ? [...champion.weaknesses] : [],
      };
    })
    .filter((champion) => champion?.champion);
}

function normalizeSlot(slot) {
  return slot === 'b' ? 'b' : 'a';
}

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}
