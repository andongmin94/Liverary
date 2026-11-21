import { msg } from "gt-react";
import { m } from "./i18n/messages";

import { lucideIconNames } from "./lib/lucideIconByName";
export { PROJECT_ICON_COLORS, projectIconColorClassName } from "./projectIconColors";

const POPULAR_PROJECT_ICONS: ReadonlyArray<string> = [
  "folder-code",
  "code-2",
  "terminal",
  "globe-2",
  "server",
  "database",
  "bot",
  "sparkles",
  "smartphone",
  "monitor",
  "cloud-cog",
  "package",
  "book-open",
  "flask-conical",
  "shield-check",
  "rocket",
  "gamepad-2",
  "music",
  "image",
  "shopping-bag",
  "git-branch",
  "workflow",
  "wrench",
  "layers-3",
];

export const PROJECT_EMOJIS: ReadonlyArray<{ readonly emoji: string; readonly label: string }> = [
  { emoji: "💻", label: m(msg("Computer")) },
  { emoji: "🛠️", label: m(msg("Tools")) },
  { emoji: "🚀", label: m(msg("Rocket")) },
  { emoji: "🤖", label: m(msg("Robot")) },
  { emoji: "✨", label: m(msg("Sparkles")) },
  { emoji: "⚡", label: m(msg("Lightning")) },
  { emoji: "🌐", label: m(msg("Web")) },
  { emoji: "📱", label: m(msg("Mobile")) },
  { emoji: "🖥️", label: m(msg("Desktop")) },
  { emoji: "⌨️", label: m(msg("Keyboard")) },
  { emoji: "⚙️", label: m(msg("Gear")) },
  { emoji: "🗄️", label: m(msg("Database")) },
  { emoji: "☁️", label: m(msg("Cloud")) },
  { emoji: "📦", label: m(msg("Package")) },
  { emoji: "📚", label: m(msg("Books")) },
  { emoji: "🧪", label: m(msg("Test tube")) },
  { emoji: "🔒", label: m(msg("Lock")) },
  { emoji: "🎮", label: m(msg("Game")) },
  { emoji: "🎵", label: m(msg("Music")) },
  { emoji: "🎬", label: m(msg("Movie")) },
  { emoji: "🖼️", label: m(msg("Picture")) },
  { emoji: "🛍️", label: m(msg("Shopping")) },
  { emoji: "🔥", label: m(msg("Fire")) },
  { emoji: "💡", label: m(msg("Idea")) },
  { emoji: "🧩", label: m(msg("Puzzle")) },
  { emoji: "📊", label: m(msg("Chart")) },
  { emoji: "🧠", label: m(msg("Brain")) },
  { emoji: "🦄", label: m(msg("Unicorn")) },
  { emoji: "🐙", label: m(msg("Octopus")) },
  { emoji: "🌱", label: m(msg("Seedling")) },
];

export function filterProjectIconNames(query: string): ReadonlyArray<string> {
  const normalized = query.trim().toLowerCase().replaceAll(/\s+/g, "-");
  if (!normalized) return POPULAR_PROJECT_ICONS;
  return lucideIconNames.filter((name) => name.includes(normalized)).slice(0, 60);
}

export function firstEmoji(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed);
  const segment = segments[Symbol.iterator]().next().value?.segment;
  const isFlag = /^\p{Regional_Indicator}{2}$/u.test(segment ?? "");
  const isKeycap = /^[#*0-9]\uFE0F?\u20E3$/u.test(segment ?? "");
  if (!segment || (!/\p{Extended_Pictographic}/u.test(segment) && !isFlag && !isKeycap)) {
    return null;
  }
  return segment;
}
