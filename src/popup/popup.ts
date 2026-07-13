import { DEFAULT_SETTINGS, VOLCENGINE_FAST_MODEL, type AssistantSettings } from "../shared";
import "./popup.css";

type ProviderPreset = "deepseek" | "openai" | "volcengineFast" | "volcengine" | "custom";

const PRESETS: Record<Exclude<ProviderPreset, "custom">, Pick<AssistantSettings, "apiBaseUrl" | "modelName">> = {
  volcengineFast: { apiBaseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3", modelName: VOLCENGINE_FAST_MODEL },
  volcengine: { apiBaseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3", modelName: "ark-code-latest" },
  deepseek: { apiBaseUrl: "https://api.deepseek.com", modelName: "deepseek-v4-flash" },
  openai: { apiBaseUrl: "https://api.openai.com/v1", modelName: "gpt-4o-mini" }
};
const BUILT_IN_ORIGINS = new Set(["https://api.deepseek.com", "https://api.openai.com", "https://ark.cn-beijing.volces.com"]);
const HINTS: Record<AssistantSettings["humanizeLevel"], string> = {
  clean: "适合商务和专业讨论，口语化但不故意制造错字。",
  natural: "长短句、停顿和省略更自然，不故意写错字。",
  loose: "闲聊时可偶尔出现一次轻微重复或谐音梗，不会改动关键信息。"
};

const form = document.querySelector<HTMLFormElement>("#settings-form");
const status = document.querySelector<HTMLParagraphElement>("#status");
const provider = document.querySelector<HTMLSelectElement>("#providerPreset");
const apiKey = document.querySelector<HTMLInputElement>("#apiKey");
const toggleApiKey = document.querySelector<HTMLButtonElement>("#toggleApiKey");
const humanize = document.querySelector<HTMLSelectElement>("#humanizeLevel");
const humanizeHint = document.querySelector<HTMLElement>("#humanizeHint");

if (!form || !status || !provider || !apiKey || !toggleApiKey || !humanize || !humanizeHint) {
  throw new Error("XReplyGen Free popup is missing required fields.");
}

const statusEl = status;
const providerEl = provider;
const humanizeHintEl = humanizeHint;
let statusTimer: number | null = null;

void loadSettings();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveSettings();
});

providerEl.addEventListener("change", () => applyPreset(providerEl.value as ProviderPreset));
document.querySelector<HTMLInputElement>("#apiBaseUrl")?.addEventListener("input", () => (providerEl.value = "custom"));
document.querySelector<HTMLInputElement>("#modelName")?.addEventListener("input", () => (providerEl.value = "custom"));
humanize.addEventListener("change", () => renderHumanizeHint(humanize.value as AssistantSettings["humanizeLevel"]));
toggleApiKey.addEventListener("click", () => {
  const visible = apiKey.type === "password";
  apiKey.type = visible ? "text" : "password";
  toggleApiKey.textContent = visible ? "隐藏" : "显示";
  toggleApiKey.setAttribute("aria-label", visible ? "隐藏 API Key" : "显示 API Key");
});

async function loadSettings(): Promise<void> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const settings = { ...DEFAULT_SETTINGS, ...stored } as AssistantSettings;
  providerEl.value = inferPreset(settings);
  setValue("apiBaseUrl", settings.apiBaseUrl);
  setValue("apiKey", settings.apiKey);
  setValue("modelName", settings.modelName);
  setValue("defaultLanguage", settings.defaultLanguage);
  setValue("interfaceLanguage", settings.interfaceLanguage);
  setValue("voicePreset", settings.voicePreset);
  setValue("humanizeLevel", settings.humanizeLevel);
  renderHumanizeHint(settings.humanizeLevel);
}

function applyPreset(preset: ProviderPreset): void {
  if (preset === "custom") return;
  setValue("apiBaseUrl", PRESETS[preset].apiBaseUrl);
  setValue("modelName", PRESETS[preset].modelName);
}

function inferPreset(settings: AssistantSettings): ProviderPreset {
  const baseUrl = settings.apiBaseUrl.replace(/\/+$/, "");
  const match = Object.entries(PRESETS).find(([, preset]) => preset.apiBaseUrl === baseUrl);
  return match ? (match[0] as ProviderPreset) : "custom";
}

async function saveSettings(): Promise<void> {
  const apiBaseUrl = getValue("apiBaseUrl").replace(/\/+$/, "");
  const apiUrl = getApiUrl(apiBaseUrl);
  if (!apiUrl) {
    showStatus("API Base URL 必须是有效的 HTTPS 地址，且不能包含参数或凭据。", true);
    return;
  }

  if (!BUILT_IN_ORIGINS.has(apiUrl.origin)) {
    const granted = await chrome.permissions.request({ origins: [getHostPermissionPattern(apiUrl)] });
    if (!granted) {
      showStatus(`需要允许访问 ${apiUrl.hostname} 才能使用这个 API。`, true);
      return;
    }
  }

  const settings: AssistantSettings = {
    apiBaseUrl,
    apiKey: getValue("apiKey"),
    modelName: getValue("modelName"),
    defaultLanguage: getValue("defaultLanguage") as AssistantSettings["defaultLanguage"],
    interfaceLanguage: getValue("interfaceLanguage") as AssistantSettings["interfaceLanguage"],
    voicePreset: getValue("voicePreset") as AssistantSettings["voicePreset"],
    humanizeLevel: getValue("humanizeLevel") as AssistantSettings["humanizeLevel"]
  };
  await chrome.storage.local.set(settings);
  showStatus("已保存。API Key 仍只在本机。", false);
}

function getApiUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash ? url : null;
  } catch {
    return null;
  }
}

function getHostPermissionPattern(url: URL): string {
  return `${url.protocol}//${url.hostname}/*`;
}

function getValue(id: keyof AssistantSettings): string {
  const field = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
  return field?.value.trim() ?? "";
}

function setValue(id: keyof AssistantSettings, value: string): void {
  const field = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
  if (field) field.value = value;
}

function renderHumanizeHint(level: AssistantSettings["humanizeLevel"]): void {
  humanizeHintEl.textContent = HINTS[level] ?? HINTS.natural;
}

function showStatus(message: string, isError: boolean): void {
  if (statusTimer !== null) window.clearTimeout(statusTimer);
  statusEl.textContent = message;
  statusEl.dataset.tone = isError ? "error" : "success";
  statusTimer = window.setTimeout(() => {
    statusEl.textContent = "";
    delete statusEl.dataset.tone;
    statusTimer = null;
  }, 3600);
}
