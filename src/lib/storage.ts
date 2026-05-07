/**
 * 本地数据层（localStorage）
 *
 * 三张「表」：
 *   - history     —— 出卡历史（用于历史时间轴 + 明日验证回路）
 *   - dex         —— 图鉴解锁记录（Bristol × 颜色 + 成就）
 *   - settings    —— 偏好（音效 / 震动 / tone / 校准 bias）
 *
 * 设计原则：
 *   - SSR 安全：所有访问都过 `safe()` 守卫
 *   - 零依赖：只用浏览器原生 API
 *   - 容错：解析失败返回默认值，不抛
 *   - 版本化：每张表带 schemaVersion；后续不兼容时统一在 migrate() 里处理
 *   - 容量保护：history 上限 90 天，超出按时间倒序裁剪
 */

import type { Prediction } from "./predict";
import type { IntakeItem } from "./types";

// ---------- 常量 ----------

const KEY = {
  history: "lasa.history.v1",
  dex: "lasa.dex.v1",
  settings: "lasa.settings.v1",
  achievements: "lasa.achievements.v1",
  customFoods: "lasa.customFoods.v1",
} as const;

const HISTORY_MAX = 90;

// ---------- 公共类型 ----------

export type Verdict = "accurate" | "partial" | "wrong";

/** 简化的摄入项快照——避免 IntakeItem 内部字段变化打破历史 */
export type IntakeSnapshot = {
  id: string;
  emoji: string;
  name: string;
  grams: number;
  source: "preset" | "ai";
};

export type HistoryEntry = {
  /** ISO date YYYY-MM-DD —— 当天首次出卡的日期 */
  date: string;
  /** 高精度时间戳 —— 用于排序与去重 */
  timestamp: number;
  /** 预测核心字段 */
  bristol: Prediction["bristol"];
  color: Prediction["color"];
  greasy: boolean;
  floats: boolean;
  smell: number;
  volume: Prediction["volume"];
  totalKcal: number;
  /** 用户摄入快照 */
  intake: IntakeSnapshot[];
  /** 触发的成就 id（若有）*/
  achievementId?: string;
  /** 用户对前一日预测的反馈 —— 在第二天回看时填写 */
  verdict?: Verdict;
  verdictAt?: number;
  verdictNote?: string;
};

export type DexCell = {
  /** Bristol 1-7 + 颜色枚举 */
  bristol: Prediction["bristol"];
  color: Prediction["color"];
  /** 首次解锁时间 */
  unlockedAt: number;
  /** 解锁次数 */
  count: number;
};

export type AchievementRecord = {
  id: string;
  rarity: "rare" | "epic" | "legendary";
  title: string;
  blurb: string;
  /** 首次解锁时间 */
  unlockedAt: number;
  /** 解锁次数 */
  count: number;
};

/**
 * 用户保存的"常用食物" —— 由 AI 解析的食物条目一键沉淀，
 * 之后在快捷选择里直接点。
 *
 * 形状与 PresetFood 兼容（除了 category 固定 = "custom"）。
 */
export type CustomFood = {
  id: string;
  emoji: string;
  name: string;
  base: {
    grams: number;
    kcal: number;
    carbs: number;
    fiber: number;
    protein: number;
    fat: number;
  };
  tags: string[];
  savedAt: number;
};

export type Settings = {
  /** 音效开关 */
  sound: boolean;
  /** 震动开关 */
  haptics: boolean;
  /** 调性：savage 沙雕 / gentle 温柔 */
  tone: "savage" | "gentle";
  /** 用户校准 bias —— 由"准/不准"反馈累积，影响下次预测的微调 */
  calibration: {
    /** 形态偏移：>0 倾向更稀，<0 倾向更硬 */
    bristolBias: number;
    /** 体积偏移：>0 倾向更多，<0 倾向更少 */
    volumeBias: number;
    /** 反馈累计次数 */
    samples: number;
  };
};

const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  tone: "savage",
  calibration: { bristolBias: 0, volumeBias: 0, samples: 0 },
};

// ---------- SSR 安全壳 ----------

function safe<T>(fn: () => T, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function read<T>(key: string, fallback: T): T {
  return safe(() => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  }, fallback);
}

function write<T>(key: string, value: T): void {
  safe(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
    notifyMutation();
  }, undefined);
}

// ---------- 变更事件 ----------
//
// 任何 write 都触发一次。cloud-sync 订阅这个事件来节流上传。
// 内部的 SSR 守卫已经吃掉了 server-side 调用，listener 永远在浏览器跑。

type MutationListener = () => void;
const mutationListeners = new Set<MutationListener>();

export function onStorageMutation(fn: MutationListener): () => void {
  mutationListeners.add(fn);
  return () => {
    mutationListeners.delete(fn);
  };
}

function notifyMutation() {
  mutationListeners.forEach((l) => {
    try { l(); } catch { /* swallow */ }
  });
}

// ---------- 历史 ----------

export function getHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(KEY.history, []);
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const list = getHistory();
  // 同一时间戳去重（防止用户连点）
  const dedup = list.filter((e) => e.timestamp !== entry.timestamp);
  const next = [entry, ...dedup].slice(0, HISTORY_MAX);
  write(KEY.history, next);
  return next;
}

/** 给最近一条历史打上"准/不准"反馈 */
export function setVerdict(timestamp: number, verdict: Verdict, note?: string): HistoryEntry[] {
  const list = getHistory();
  const next = list.map((e) =>
    e.timestamp === timestamp
      ? { ...e, verdict, verdictAt: Date.now(), verdictNote: note }
      : e,
  );
  write(KEY.history, next);
  // 反馈一并影响校准
  applyCalibrationFromVerdict(verdict);
  return next;
}

/**
 * 找出"昨天预测但今天还没反馈"的最近一条 —— 主页弹"昨天准不准"用
 *
 * "昨天" = 用户今天打开页面相对于上一次出卡的本地日期
 */
export function findPendingVerdict(today: string = todayLocal()): HistoryEntry | null {
  const list = getHistory();
  for (const e of list) {
    if (e.verdict) continue;
    if (e.date < today) return e;
  }
  return null;
}

/** YYYY-MM-DD（本地时区） */
export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- 图鉴 ----------

export function getDex(): DexCell[] {
  return read<DexCell[]>(KEY.dex, []);
}

export function unlockDex(bristol: DexCell["bristol"], color: DexCell["color"]): DexCell[] {
  const list = getDex();
  const idx = list.findIndex((c) => c.bristol === bristol && c.color === color);
  let next: DexCell[];
  if (idx === -1) {
    next = [{ bristol, color, unlockedAt: Date.now(), count: 1 }, ...list];
  } else {
    const existing = list[idx]!;
    next = [...list];
    next[idx] = { ...existing, count: existing.count + 1 };
  }
  write(KEY.dex, next);
  return next;
}

/** 当前格子是否首次解锁 —— 用于触发"新格点亮"动效 */
export function isFirstUnlock(
  bristol: DexCell["bristol"],
  color: DexCell["color"],
): boolean {
  const list = getDex();
  return !list.some((c) => c.bristol === bristol && c.color === color);
}

// ---------- 成就 ----------

export function getAchievements(): AchievementRecord[] {
  return read<AchievementRecord[]>(KEY.achievements, []);
}

export function unlockAchievement(rec: Omit<AchievementRecord, "unlockedAt" | "count">): {
  list: AchievementRecord[];
  isFirst: boolean;
} {
  const list = getAchievements();
  const idx = list.findIndex((a) => a.id === rec.id);
  let next: AchievementRecord[];
  let isFirst: boolean;
  if (idx === -1) {
    next = [{ ...rec, unlockedAt: Date.now(), count: 1 }, ...list];
    isFirst = true;
  } else {
    const existing = list[idx]!;
    next = [...list];
    next[idx] = { ...existing, count: existing.count + 1 };
    isFirst = false;
  }
  write(KEY.achievements, next);
  return { list: next, isFirst };
}

// ---------- 设置 ----------

export function getSettings(): Settings {
  const stored = read<Partial<Settings> | null>(KEY.settings, null);
  if (!stored) return DEFAULT_SETTINGS;
  // 字段补全，防止旧版本缺字段
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    calibration: { ...DEFAULT_SETTINGS.calibration, ...(stored.calibration ?? {}) },
  };
}

export function patchSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write(KEY.settings, next);
  return next;
}

/**
 * 反馈 → 校准回路
 *
 * 简化逻辑：
 *   - accurate：保持现状（小幅向 0 收敛）
 *   - partial：不动
 *   - wrong：bristolBias 向反方向轻微推
 *
 * 真正的反向推方向需要知道"用户实际比预测更稀还是更硬"，目前没拿到——
 * 第一波只统计"反馈次数"，等阶段 2 把"实际形态"输入框做出来再展开。
 */
function applyCalibrationFromVerdict(verdict: Verdict): void {
  const s = getSettings();
  const cal = { ...s.calibration };
  cal.samples += 1;
  if (verdict === "accurate") {
    cal.bristolBias *= 0.9;
    cal.volumeBias *= 0.9;
  }
  patchSettings({ calibration: cal });
}

// ---------- 常用食物 ----------

export function getCustomFoods(): CustomFood[] {
  return read<CustomFood[]>(KEY.customFoods, []);
}

/**
 * 名字相同视为同一项 → 更新 macros 而不是重复加。
 * 上限 30 项；超过时按 savedAt 倒序裁剪。
 */
export function saveCustomFood(
  input: Omit<CustomFood, "id" | "savedAt">,
): CustomFood {
  const list = getCustomFoods();
  const idx = list.findIndex((f) => f.name === input.name);
  let saved: CustomFood;
  let next: CustomFood[];
  if (idx === -1) {
    saved = { ...input, id: cryptoId(), savedAt: Date.now() };
    next = [saved, ...list].slice(0, 30);
  } else {
    saved = { ...list[idx]!, ...input, savedAt: Date.now() };
    next = [...list];
    next[idx] = saved;
  }
  write(KEY.customFoods, next);
  return saved;
}

export function removeCustomFood(id: string): CustomFood[] {
  const list = getCustomFoods();
  const next = list.filter((f) => f.id !== id);
  write(KEY.customFoods, next);
  return next;
}

function cryptoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 把 CustomFood 转成 PresetFood 形状，喂给 QuickPickPane / intakeFromPreset */
export function customFoodToPresetShape(f: CustomFood): {
  id: string;
  emoji: string;
  name: string;
  category: "custom";
  base: CustomFood["base"];
  tags: string[];
} {
  return {
    id: `custom-${f.id}`,
    emoji: f.emoji,
    name: f.name,
    category: "custom" as const,
    base: f.base,
    tags: f.tags,
  };
}

// ---------- 一站式：出卡时同步写入 ----------

export type RecordCardInput = {
  prediction: Prediction;
  intake: IntakeItem[];
  achievement?: { id: string; rarity: "rare" | "epic" | "legendary"; title: string; blurb: string };
};

/**
 * 出卡完成时调用：一次写完 history + dex (+ achievement)
 *
 * @returns 含本次写入是否首次解锁了图鉴格 / 成就 —— 用于触发"新解锁"动效
 */
export function recordCard({ prediction, intake, achievement }: RecordCardInput): {
  entry: HistoryEntry;
  dexFirstUnlock: boolean;
  achievementFirstUnlock: boolean;
} {
  const dexFirstUnlock = isFirstUnlock(prediction.bristol, prediction.color);
  const entry: HistoryEntry = {
    date: todayLocal(),
    timestamp: Date.now(),
    bristol: prediction.bristol,
    color: prediction.color,
    greasy: prediction.greasy,
    floats: prediction.floats,
    smell: prediction.smell,
    volume: prediction.volume,
    totalKcal: Math.round(prediction.totalMacros.kcal),
    intake: intake.map((i) => ({
      id: i.id,
      emoji: i.emoji,
      name: i.name,
      grams: Math.round(i.grams),
      source: i.source,
    })),
    achievementId: achievement?.id,
  };
  appendHistory(entry);
  unlockDex(prediction.bristol, prediction.color);
  let achievementFirstUnlock = false;
  if (achievement) {
    const { isFirst } = unlockAchievement(achievement);
    achievementFirstUnlock = isFirst;
  }
  return { entry, dexFirstUnlock, achievementFirstUnlock };
}

// ---------- 调试 / 导出 ----------

/** 全量导出，方便用户备份 / 切机器 */
export function exportAll(): string {
  return JSON.stringify(
    {
      schemaVersion: 2,
      exportedAt: Date.now(),
      history: getHistory(),
      dex: getDex(),
      achievements: getAchievements(),
      settings: getSettings(),
      customFoods: getCustomFoods(),
    },
    null,
    2,
  );
}

/** 全量清空——危险操作，UI 上必须二次确认 */
export function clearAll(): void {
  safe(() => {
    Object.values(KEY).forEach((k) => window.localStorage.removeItem(k));
    notifyMutation();
  }, undefined);
}

/**
 * 从 JSON 字符串里恢复全部数据（exportAll() 的逆操作）。
 *
 * 容错：
 *  - 顶层不是 object → 抛
 *  - 部分字段缺失 → 仅恢复存在的；其它保持当前值
 *  - 字段类型不对 → 跳过那一项；其它继续
 *
 * @returns 复原成功的表名列表
 */
export function importAll(json: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("JSON 解析失败");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("数据格式不对");
  }
  const obj = parsed as Record<string, unknown>;
  const restored: string[] = [];

  if (Array.isArray(obj.history)) {
    write(KEY.history, obj.history);
    restored.push("history");
  }
  if (Array.isArray(obj.dex)) {
    write(KEY.dex, obj.dex);
    restored.push("dex");
  }
  if (Array.isArray(obj.achievements)) {
    write(KEY.achievements, obj.achievements);
    restored.push("achievements");
  }
  if (obj.settings && typeof obj.settings === "object") {
    write(KEY.settings, obj.settings);
    restored.push("settings");
  }
  if (Array.isArray(obj.customFoods)) {
    write(KEY.customFoods, obj.customFoods);
    restored.push("customFoods");
  }
  if (restored.length === 0) {
    throw new Error("没识别到任何已知字段（history / dex / achievements / settings / customFoods）");
  }
  return restored;
}
