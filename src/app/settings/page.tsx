"use client";

/**
 * 设置页 —— 控制 storage.Settings + 提供数据导出/清空
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, CloudUpload, CloudDownload, Download, Trash2, Upload, X } from "lucide-react";
import {
  getSettings,
  patchSettings,
  exportAll,
  importAll,
  clearAll,
  getCustomFoods,
  removeCustomFood,
  type Settings,
  type CustomFood,
} from "@/lib/storage";
import {
  pushNow,
  pullOnce,
  deleteCloud,
  onSyncStatus,
  type SyncStatus,
} from "@/lib/cloud-sync";
import { SettingsSkeleton } from "@/components/skeletons";

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: "idle" });
  const [busy, setBusy] = useState<"push" | "pull" | "wipe" | null>(null);

  useEffect(() => {
    setSettings(getSettings());
    setCustomFoods(getCustomFoods());
    return onSyncStatus(setSyncStatus);
  }, []);

  const handlePush = async () => {
    setBusy("push");
    await pushNow();
    setBusy(null);
  };
  const handlePull = async () => {
    setBusy("pull");
    const r = await pullOnce();
    setBusy(null);
    if (r.pulled) {
      // 拉到了 → 重新读各表
      setSettings(getSettings());
      setCustomFoods(getCustomFoods());
    }
  };
  const handleCloudWipe = async () => {
    if (!confirm("确认从云端永久删除你的备份？此操作不可撤回。")) return;
    setBusy("wipe");
    await deleteCloud();
    setBusy(null);
  };

  const handleDeleteCustom = (id: string) => {
    setCustomFoods(removeCustomFood(id));
  };

  const update = (patch: Partial<Settings>) => {
    setSettings(patchSettings(patch));
  };

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

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

  const handleImport = async (file: File) => {
    setImportMsg(null);
    try {
      const text = await file.text();
      const restored = importAll(text);
      setSettings(getSettings());
      setCustomFoods(getCustomFoods());
      setImportMsg(`恢复成功：${restored.join(" / ")}`);
    } catch (e) {
      setImportMsg(`导入失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
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
            sub="掉落、出卡、解锁的几声反馈音"
            checked={settings.sound}
            onChange={(v) => update({ sound: v })}
          />
          <Toggle
            label="震动"
            sub="动效关键节点同步震动（仅移动端）"
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
              { value: "savage", label: "沙雕模式（默认）", sub: "嘴贱但善意，原汁原味" },
              { value: "gentle", label: "温柔模式", sub: "营养师视角，能转发给爸妈和同事" },
            ]}
            onChange={(v) => update({ tone: v as Settings["tone"] })}
          />
        </section>

        <section className="settings-group">
          <h3 className="settings-title">校准</h3>
          <p className="settings-sub">
            根据你的「准/不准」反馈，下次预测会自动微调。<br />
            累计反馈：<strong>{settings.calibration.samples}</strong> 次 · 形态偏移 {settings.calibration.bristolBias.toFixed(2)} · 体积偏移 {settings.calibration.volumeBias.toFixed(2)}
          </p>
        </section>

        <section className="settings-group">
          <h3 className="settings-title">云端同步</h3>
          {authStatus !== "authenticated" ? (
            <p className="settings-sub">
              <Link href="/sign-in?callbackUrl=/settings">登录</Link>后可在多台设备间同步历史和设置。
              不登录也能用，所有数据存在本地。
            </p>
          ) : (
            <>
              <p className="settings-sub">
                已登录为 <strong>{session?.user?.email ?? session?.user?.name}</strong>。
                每次本地写入会自动节流上传；下面也可以手动触发。
              </p>
              <p className="settings-sub" data-sync-status>
                <SyncStatusLine status={syncStatus} />
              </p>
              <div className="settings-sync-actions">
                <button
                  className="btn-secondary settings-btn"
                  type="button"
                  onClick={handlePush}
                  disabled={busy !== null}
                >
                  <CloudUpload size={14} aria-hidden /> {busy === "push" ? "推送中…" : "立即推送"}
                </button>
                <button
                  className="btn-secondary settings-btn"
                  type="button"
                  onClick={handlePull}
                  disabled={busy !== null}
                >
                  <CloudDownload size={14} aria-hidden /> {busy === "pull" ? "拉取中…" : "从云端拉取"}
                </button>
                <button
                  className="btn-danger settings-btn"
                  type="button"
                  onClick={handleCloudWipe}
                  disabled={busy !== null}
                >
                  <Trash2 size={14} aria-hidden /> 删除云端备份
                </button>
              </div>
            </>
          )}
        </section>

        <section className="settings-group">
          <h3 className="settings-title">我的常用食物</h3>
          {customFoods.length === 0 ? (
            <p className="custom-food-empty">
              还没有自己的常用食物。在「描述一下」里 AI 解析出食物后，点星标即可保存。
            </p>
          ) : (
            <ul className="custom-foods-list">
              {customFoods.map((f) => (
                <li key={f.id} className="custom-food-row">
                  <span className="custom-food-emoji" aria-hidden>{f.emoji}</span>
                  <span className="custom-food-name">{f.name}</span>
                  <span className="custom-food-meta tabular">
                    {f.base.grams}g · {f.base.kcal}kcal
                  </span>
                  <button
                    className="custom-food-delete"
                    type="button"
                    onClick={() => handleDeleteCustom(f.id)}
                    aria-label={`删除 ${f.name}`}
                    title="删除"
                  >
                    <X size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="settings-group">
          <h3 className="settings-title">数据</h3>
          <button className="btn-secondary settings-btn" type="button" onClick={handleExport}>
            <Download size={14} aria-hidden /> 导出我的数据（JSON）
          </button>
          <button
            className="btn-secondary settings-btn"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={14} aria-hidden /> 从 JSON 导入
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
            }}
          />
          {importMsg && (
            <p
              className={`settings-sub ${importMsg.startsWith("导入失败") ? "danger" : "ok"}`}
              role="status"
              aria-live="polite"
            >
              {importMsg}
            </p>
          )}
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

function SyncStatusLine({ status }: { status: SyncStatus }) {
  switch (status.kind) {
    case "idle":
      return <span className="muted">待同步…</span>;
    case "pulling":
      return <span>从云端拉取中…</span>;
    case "pushing":
      return <span>推送到云端中…</span>;
    case "ok":
      return <span className="ok">最近一次同步：{new Date(status.lastSyncedAt).toLocaleTimeString()}</span>;
    case "error":
      return <span className="muted danger">出错：{status.message}</span>;
  }
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
