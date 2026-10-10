
const KEY = "deadline13-save";

const DEFAULT_SAVE = {
  bestScore: 0,
  completedShifts: 0,
  volume: 0.35
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SAVE, ...JSON.parse(raw) } : { ...DEFAULT_SAVE };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function storeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Не удалось сохранить прогресс:", error);
  }
}

export function recordResult(score) {
  const save = loadSave();
  save.completedShifts += 1;
  save.bestScore = Math.max(save.bestScore, score);
  storeSave(save);
  return save;
}