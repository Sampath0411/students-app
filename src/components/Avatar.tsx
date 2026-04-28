import { useMemo, useState } from "react";
import { createAvatar } from "@dicebear/core";
import * as collection from "@dicebear/collection";

export const AVATAR_STYLES = [
  "micah",
  "avataaars",
  "bottts",
  "lorelei",
  "notionists",
  "adventurer",
  "funEmoji",
  "pixelArt",
  "thumbs",
  "shapes",
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export const renderAvatarSvg = (style: string, seed: string) => {
  const lib: any = (collection as any)[style] ?? (collection as any).micah;
  return createAvatar(lib, { seed }).toString();
};

export const renderAvatarDataUri = (style: string, seed: string) => {
  const lib: any = (collection as any)[style] ?? (collection as any).micah;
  return createAvatar(lib, { seed }).toDataUri();
};

export const Avatar = ({
  style,
  seed,
  size = 96,
  className = "",
}: {
  style: string;
  seed: string;
  size?: number;
  className?: string;
}) => {
  const uri = useMemo(() => renderAvatarDataUri(style || "micah", seed || "default"), [style, seed]);
  return (
    <img
      src={uri}
      width={size}
      height={size}
      alt="avatar"
      className={`rounded-2xl bg-muted ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export const AvatarPicker = ({
  value,
  onChange,
  disabled,
}: {
  value: { style: string; seed: string };
  onChange: (v: { style: string; seed: string }) => void;
  disabled?: boolean;
}) => {
  const [seed, setSeed] = useState(value.seed || "");
  const setStyle = (style: string) => onChange({ ...value, style });
  const randomize = () => {
    const next = Math.random().toString(36).slice(2, 10);
    setSeed(next);
    onChange({ ...value, seed: next });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar style={value.style} seed={value.seed} size={96} />
        <div className="flex-1 space-y-2">
          <input
            disabled={disabled}
            value={seed}
            onChange={(e) => {
              setSeed(e.target.value);
              onChange({ ...value, seed: e.target.value });
            }}
            placeholder="Type a seed (any text)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={randomize}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            🎲 Randomize
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {AVATAR_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => setStyle(s)}
            className={`rounded-lg border p-1 transition ${value.style === s ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"} disabled:opacity-50`}
            title={s}
          >
            <Avatar style={s} seed={value.seed || "preview"} size={48} />
            <div className="mt-1 truncate text-[9px] text-muted-foreground">{s}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
