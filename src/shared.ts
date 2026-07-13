export type ReplyMode = "agree" | "question" | "playful" | "counter" | "attract" | "chinese" | "english";

export type ReplyLanguage = "auto" | "zh" | "en" | "ja" | "ko" | "es" | "fr" | "de" | "pt" | "ru" | "ar";
export type InterfaceLanguage = "auto" | "zh" | "en";
export type ReplySite = "x" | "generic";
export type ReplyVoicePreset = "natural" | "witty" | "founder" | "analyst" | "warm" | "contrarian";
export type HumanizeLevel = "clean" | "natural" | "loose";

export type AssistantSettings = {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  defaultLanguage: ReplyLanguage;
  interfaceLanguage: InterfaceLanguage;
  voicePreset: ReplyVoicePreset;
  humanizeLevel: HumanizeLevel;
};

export type GenerateRepliesRequest = {
  type: "generate-replies";
  mode: ReplyMode;
  tweetText: string;
  replyLanguage?: ReplyLanguage;
  site?: ReplySite;
  pageUrl?: string;
  regenerate?: boolean;
  nonce?: string;
};

export type GenerateRepliesResponse = {
  ok: boolean;
  replies?: string[];
  error?: string;
};

export const VOLCENGINE_FAST_MODEL = "Doubao-Seed-2.0-Code";

export const DEFAULT_SETTINGS: AssistantSettings = {
  apiBaseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3",
  apiKey: "",
  modelName: VOLCENGINE_FAST_MODEL,
  defaultLanguage: "auto",
  interfaceLanguage: "auto",
  voicePreset: "natural",
  humanizeLevel: "natural"
};
