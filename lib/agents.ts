export type Bot = { app: string; name: string; handle: string };

export const AGENTS: Bot[] = [
  { app: "copilot-swe-agent", name: "GitHub Copilot", handle: "Copilot" },
  { app: "devin-ai-integration", name: "Devin", handle: "devin-ai-integration[bot]" },
  { app: "claude", name: "Claude", handle: "claude[bot]" },
  { app: "cursor", name: "Cursor", handle: "cursor[bot]" },
  { app: "google-labs-jules", name: "Jules", handle: "google-labs-jules[bot]" },
];
