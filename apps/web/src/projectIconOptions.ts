import { applicationText } from "~/locales/ko/application";
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
  { emoji: "💻", label: applicationText["Computer"] },
  { emoji: "🛠️", label: applicationText["Tools"] },
  { emoji: "🚀", label: applicationText["Rocket"] },
  { emoji: "🤖", label: applicationText["Robot"] },
  { emoji: "✨", label: applicationText["Sparkles"] },
  { emoji: "⚡", label: applicationText["Lightning"] },
  { emoji: "🌐", label: applicationText["Web"] },
  { emoji: "📱", label: applicationText["Mobile"] },
  { emoji: "🖥️", label: applicationText["Desktop"] },
  { emoji: "⌨️", label: applicationText["Keyboard"] },
  { emoji: "⚙️", label: applicationText["Gear"] },
  { emoji: "🗄️", label: applicationText["Database"] },
  { emoji: "☁️", label: applicationText["Cloud"] },
  { emoji: "📦", label: applicationText["Package"] },
  { emoji: "📚", label: applicationText["Books"] },
  { emoji: "🧪", label: applicationText["Test tube"] },
  { emoji: "🔒", label: applicationText["Lock"] },
  { emoji: "🎮", label: applicationText["Game"] },
  { emoji: "🎵", label: applicationText["Music"] },
  { emoji: "🎬", label: applicationText["Movie"] },
  { emoji: "🖼️", label: applicationText["Picture"] },
  { emoji: "🛍️", label: applicationText["Shopping"] },
  { emoji: "🔥", label: applicationText["Fire"] },
  { emoji: "💡", label: applicationText["Idea"] },
  { emoji: "🧩", label: applicationText["Puzzle"] },
  { emoji: "📊", label: applicationText["Chart"] },
  { emoji: "🧠", label: applicationText["Brain"] },
  { emoji: "🦄", label: applicationText["Unicorn"] },
  { emoji: "🐙", label: applicationText["Octopus"] },
  { emoji: "🌱", label: applicationText["Seedling"] },
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
