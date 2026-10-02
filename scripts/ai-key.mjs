/**
 * Vendos çelësin e modelit te `.env`, pa e hapur skedarin me dorë.
 *
 * Lësho: `npm run ai:key -- <çelësi>`
 *
 * Asistenti ka një ofrues të vetëm, përmes protokollit të OpenAI-t. Çelësi njihet
 * nga forma e vet:
 *
 *   gsk_     Groq, falas dhe pa kartë (parazgjedhja)
 *   xai-     xAI Grok
 *   sk-or-   OpenRouter
 *
 * Modeli i tekstit dhe ai i imazheve zgjidhen nga lista e gjallë e ofruesit në
 * çastin e vendosjes, sepse emrat e modeleve ndërrohen shpesh.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const key = process.argv[2]?.trim();

if (!key) {
  console.log("Përdorimi: npm run ai:key -- <çelësi>");
  console.log("");
  console.log("Groq, falas dhe pa kartë:  https://console.groq.com/keys");
  console.log("xAI Grok:                  https://console.x.ai");
  process.exit(1);
}

const PROVIDERS = [
  {
    prefix: "gsk_",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    text: [(id) => /gpt-oss-120b/i.test(id), (id) => /llama.*70b/i.test(id), (id) => /gpt-oss/i.test(id)],
    vision: [(id) => /qwen3/i.test(id), (id) => /llama-4|vision/i.test(id)],
    utility: [(id) => /gpt-oss-20b/i.test(id), (id) => /instant|8b/i.test(id)],
  },
  {
    prefix: "xai-",
    name: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    text: [(id) => /^grok-\d/i.test(id) && !/image|vision|mini/i.test(id), (id) => /grok/i.test(id)],
    vision: [(id) => /grok.*vision/i.test(id), (id) => /^grok-\d/i.test(id) && !/image/i.test(id)],
    utility: [(id) => /grok.*mini/i.test(id), (id) => /grok/i.test(id)],
  },
  {
    prefix: "sk-or-",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    text: [(id) => id.endsWith(":free") && /(gpt-oss|llama|qwen|deepseek)/i.test(id), (id) => id.endsWith(":free")],
    vision: [(id) => id.endsWith(":free") && /(vl|vision|qwen3|gemma-3)/i.test(id)],
    utility: [(id) => id.endsWith(":free")],
  },
];

const provider = PROVIDERS.find((item) => key.startsWith(item.prefix));
if (!provider) {
  console.log("Nuk e njoh këtë çelës. Groq nis me «gsk_», xAI Grok me «xai-», OpenRouter me «sk-or-».");
  process.exit(1);
}

let ids = [];
try {
  const response = await fetch(`${provider.baseUrl}/models`, { headers: { authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(String(response.status));
  ids = ((await response.json())?.data ?? []).map((model) => model.id);
} catch {
  console.log("Çelësi nuk u pranua, ose lista e modeleve nuk u lexua. Kontrollo çelësin dhe provo sërish.");
  process.exit(1);
}

const pick = (tests) => tests.map((test) => ids.find(test)).find(Boolean) ?? null;
const text = pick(provider.text) ?? ids[0];
const vision = pick(provider.vision);
const utility = pick(provider.utility) ?? text;

const path = ".env";
let env = existsSync(path) ? readFileSync(path, "utf8") : "";

/** Zëvendëson rreshtin nëse ekziston, ndryshe e shton në fund. */
function set(variable, value) {
  const pattern = new RegExp(`^${variable}=.*$`, "m");
  const line = `${variable}=${value}`;
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.replace(/\n*$/, "\n")}${line}\n`;
}

set("AI_API_KEY", key);
set("AI_BASE_URL", `"${provider.baseUrl}"`);
set("AI_MODEL", `"${text}"`);
if (vision) set("AI_VISION_MODEL", `"${vision}"`);
set("AI_UTILITY_MODEL", `"${utility}"`);
set("AI_PROVIDER", '"openai"');
writeFileSync(path, env, "utf8");

console.log(`U vendos ${provider.name}: teksti ${text}, imazhet ${vision ?? "(asnjë model që sheh)"}, titujt ${utility}.`);
console.log("Tani lësho: npm run ai:check");
