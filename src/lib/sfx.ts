/**
 * 轻量音效 + 震动
 *
 * 不引入外部音频文件——用 Web Audio API 合成三个短促的音色。
 * 优点：零网络成本、零安装步骤；缺点：音色比真音简陋（但符合"沙雕陶土"调性）
 *
 * 全部走用户设置：getSettings().sound / .haptics 关闭则静默
 */

import { getSettings } from "./storage";

type SfxName = "drop" | "polaroid" | "fanfare" | "tick";

let cachedCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedCtx) return cachedCtx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    cachedCtx = new Ctor();
    return cachedCtx;
  } catch {
    return null;
  }
}

/**
 * 单个短音 envelope：attack-decay 形包络
 */
function tone(
  c: AudioContext,
  freq: number,
  durMs: number,
  type: OscillatorType,
  startOffsetSec = 0,
  gain = 0.18,
): void {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + startOffsetSec;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(env).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.05);
}

const PATTERNS: Record<SfxName, (c: AudioContext) => void> = {
  // 屎落水 "啵—咚—" 低频两段
  drop: (c) => {
    tone(c, 220, 80, "sine", 0, 0.22);
    tone(c, 90, 220, "sine", 0.06, 0.28);
  },
  // 拍立得咔嚓 + 嘶嘶
  polaroid: (c) => {
    tone(c, 1200, 35, "square", 0, 0.16);
    tone(c, 600, 60, "triangle", 0.04, 0.12);
  },
  // 成就 fanfare：三连上升
  fanfare: (c) => {
    tone(c, 523.25, 120, "triangle", 0, 0.18); // C5
    tone(c, 659.25, 120, "triangle", 0.1, 0.18); // E5
    tone(c, 783.99, 240, "triangle", 0.2, 0.20); // G5
  },
  // UI tick：极短高频
  tick: (c) => {
    tone(c, 800, 25, "sine", 0, 0.10);
  },
};

/**
 * 播一个音；可附带震动模式
 */
export function play(name: SfxName, vibratePattern?: number | number[]): void {
  if (typeof window === "undefined") return;
  const settings = getSettings();
  if (settings.sound) {
    const c = ctx();
    if (c) {
      // iOS Safari 要求第一次播放在 user gesture 内并 resume
      if (c.state === "suspended") c.resume().catch(() => {});
      try {
        PATTERNS[name](c);
      } catch {
        // 静默失败
      }
    }
  }
  if (settings.haptics && vibratePattern !== undefined && typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(vibratePattern);
    } catch {
      // 部分平台 throw（如 iOS Safari），忽略
    }
  }
}

/** 主流程常用震动+音效组合 */
export const SFX = {
  drop: () => play("drop", [40, 60, 30]),
  polaroid: () => play("polaroid", 20),
  fanfare: () => play("fanfare", [60, 40, 60, 40, 120]),
  tick: () => play("tick"),
} as const;
