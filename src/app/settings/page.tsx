"use client";

/**
 * 设置页 —— 控制 storage.Settings + 提供数据导出/清空
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import {
  getSettings,
  patchSettings,
  exportAll,
  clearAll,
  type Settings,
} from "@/lib/storage";
import { SettingsSkeleton } from "@/components/skeletons";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings(patchSettings(patch));
  };

  const handleExport = () => {
    const json = exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lasa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleClear = () => {
    clearAll();
    setSettings(getSettings());
    setConfirming(false);
  };

  if (!settings) {
    return <SettingsSkeleton />;
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="brand">
          <Link href="/" className="icon-btn" aria-label="返回">
            <ArrowLeft size={14} aria-hidden /> <span>返回</span>
          </Link>
          <span className="brand-logo">
            <span className="brand-emoji" aria-hidden>⚙️</span>
            <span className="brand-zh">设置</span>
          </span>
          <span style={{ width: 56 }} />
        </header>

        <section className="settings-group">
          <h3 className="settings-title">体验</h3>
          <Toggle
            label="音效"
            sub="马桶接屎、拍立得、成就 fanfare（Web Audio 合成，零下载）"
            checked={settings.sound}
            onChange={(v) => update({ sound: v })}
          />
          <Toggle
            label="震动"
            sub="移动端：动效关键节点会同步震动"
            checked={settings.haptics}
            onChange={(v) => update({ haptics: v })}
          />
        </section>

        <section className="settings-group">
          <h3 className="settings-title">调性</h3>
          <Radio
            name="tone"
            value={settings.tone}
            options={[
              { value: "savage", label: "沙雕模式（默认）", sub: "原汁原味，AI 怎么贱怎么来" },
              { value: "gentle", label: "温柔模式", sub: "AI 改成营养师视角，可以分享给爸妈/同事" },
            ]}
            onChange={(v) => update({ tone: v as Settings["tone"] })}
          />
        </section>

        <section className="settings-group">
          <h3 className="settings-title">校准</h3>
          <p className="settings-sub">
            根据你的「准/不准」反馈累计微调下次预测。当前样本：<strong>{settings.calibration.samples}</strong> 次<br />
            形态偏移：{settings.calibration.bristolBias.toFixed(2)} · 体积偏移：{settings.calibration.volumeBias.toFixed(2)}
          </p>
        </section>

        <section className="settings-group">
          <h3 className="settings-title">数据</h3>
          <button className="btn-secondary settings-btn" type="button" onClick={handleExport}>
            <Download size={14} aria-hidden /> 导出我的数据（JSON）
          </button>
          {confirming ? (
            <div className="settings-danger-confirm">
              <p>确认清空所有历史 + 图鉴 + 成就 + 设置？此操作不可撤回。</p>
              <div className="settings-danger-actions">
                <button className="btn-secondary" type="button" onClick={() => setConfirming(false)}>
                  取消
                </button>
                <button className="btn-danger" type="button" onClick={handleClear}>
                  确认清空
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn-danger settings-btn"
              type="button"
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={14} aria-hidden /> 清空所有本地数据
            </button>
          )}
        </section>

        <p className="disclaimer">所有数据仅存在你这台设备上。</p>
      </div>
    </main>
  );
}

// ---- 子组件 ----

function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="settings-row">
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {sub && <span className="settings-row-sub">{sub}</span>}
      </span>
      <span className="switch" data-on={checked}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span className="switch-knob" />
      </span>
    </label>
  );
}

function Radio({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: { value: string; label: string; sub?: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="settings-radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="settings-row" data-active={value === opt.value}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <span className="settings-row-text">
            <span className="settings-row-label">{opt.label}</span>
            {opt.sub && <span className="settings-row-sub">{opt.sub}</span>}
          </span>
          <span className={`settings-radio-dot${value === opt.value ? " on" : ""}`} aria-hidden />
        </label>
      ))}
    </div>
  );
}
