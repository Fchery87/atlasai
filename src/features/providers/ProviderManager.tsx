import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { ProviderDefinition } from "../../lib/providers/types";
import { OpenRouterDef, OpenRouterAdapter } from "../../lib/providers/openrouter";
import { OllamaDef, OllamaAdapter } from "../../lib/providers/ollama";
import { GroqDef, GroqAdapter } from "../../lib/providers/groq";
import { AnthropicDef, AnthropicAdapter } from "../../lib/providers/anthropic";
import { GPT5Def, GPT5Adapter } from "../../lib/providers/gpt5";
import { GenericOpenAIAdapter } from "../../lib/providers/generic";
import { loadProviderKey, saveProviderKey, clearProviderKey } from "../../lib/crypto/keys";
import { loadDecrypted, saveEncrypted } from "../../lib/oauth/github";
import { z } from "zod";

type ProviderEntry = {
  def: ProviderDefinition;
  key: string;
  status?: "unknown" | "valid" | "invalid";
  message?: string;
};

const initialProviders: ProviderEntry[] = [
  { def: OpenRouterDef, key: "", status: "unknown" },
  { def: OllamaDef, key: "", status: "unknown" },
  { def: GroqDef, key: "", status: "unknown" },
  { def: AnthropicDef, key: "", status: "unknown" },
  { def: GPT5Def, key: "", status: "unknown" },
  // Custom providers will be appended at runtime from localStorage
];

function StatusBadge({ status }: { status?: "unknown" | "valid" | "invalid" }) {
  if (status === "valid") return <Badge variant="success">Valid</Badge>;
  if (status === "invalid") return <Badge variant="error">Invalid</Badge>;
  return <Badge>Unknown</Badge>;
}

export function ProviderManager() {
  const [providers, setProviders] = React.useState<ProviderEntry[]>(initialProviders);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    // Load encrypted keys from storage + custom providers
    (async () => {
      const customRaw = localStorage.getItem("bf_custom_providers");
      let customDefs: ProviderDefinition[] = [];
      try {
        if (customRaw) customDefs = JSON.parse(customRaw);
      } catch {}
      const baseList: ProviderEntry[] = [...initialProviders, ...customDefs.map((def) => ({ def, key: "", status: "unknown" as const }))];

      const entries = await Promise.all(
        baseList.map(async (p) => {
          // Load API key
          const { plaintext } = await loadProviderKey(p.def.id);
          // Load encrypted custom headers (do not rely on plaintext in custom provider JSON)
          let mergedDef = { ...p.def };
          try {
            const enc = await loadDecrypted(`sec_provider_headers:${p.def.id}`);
            if (enc) {
              const hdrs = JSON.parse(enc);
              mergedDef = { ...mergedDef, headers: { ...(mergedDef.headers ?? {}), ...hdrs } };
            }
          } catch {}
          return { ...p, def: mergedDef, key: plaintext || "" };
        })
      );
      setProviders(entries);
      const help = await loadDecrypted("sec_help_providers");
      setShowHelp(help === "1");
    })();
  }, []);

  React.useEffect(() => {
    const onReset = () => setShowHelp(false);
    window.addEventListener("bf:reset-ui-tips", onReset as EventListener);
    return () => window.removeEventListener("bf:reset-ui-tips", onReset as EventListener);
  }, []);

  React.useEffect(() => {
    // Persist help toggle globally
    saveEncrypted("sec_help_providers", showHelp ? "1" : "0");
  }, [showHelp]);

  const validate = async (p: ProviderEntry) => {
    setBusy(p.def.id);
    try {
      let result = { ok: true, message: "" };
      if (p.def.id === "openrouter") {
        result = await OpenRouterAdapter.validate(p.def, p.key);
      } else if (p.def.id === "ollama") {
        result = await OllamaAdapter.validate(p.def, p.key);
      } else if (p.def.id === "groq") {
        result = await GroqAdapter.validate(p.def, p.key);
      } else if (p.def.id === "anthropic") {
        result = await AnthropicAdapter.validate(p.def, p.key);
      } else if (p.def.id === "gpt5") {
        result = await GPT5Adapter.validate(p.def, p.key);
      } else {
        // Custom providers default to generic OpenAI adapter
        result = await GenericOpenAIAdapter.validate(p.def, p.key);
      }
      setProviders(prev =>
        prev.map(e =>
          e.def.id === p.def.id ? { ...e, status: result.ok ? "valid" : "invalid", message: result.message } : e
        )
      );
      // Persist key on successful validation (or clear if invalid)
      if (result.ok && p.def.auth.type !== "none" && p.key) {
        await saveProviderKey(p.def.id, p.key);
      } else if (!result.ok) {
        clearProviderKey(p.def.id);
      }
    } finally {
      setBusy(null);
    }
  };

  const updateKey = (id: string, key: string) => {
    setProviders(prev => prev.map(e => (e.def.id === id ? { ...e, key } : e)));
  };

  const save = async (p: ProviderEntry) => {
    if (p.def.auth.type !== "none" && p.key) {
      await saveProviderKey(p.def.id, p.key);
      setProviders(prev => prev.map(e => (e.def.id === p.def.id ? { ...e, status: "unknown" } : e)));
    }
  };

  // Custom provider form state
  const [newProv, setNewProv] = React.useState<{
    id: string;
    name: string;
    baseUrl: string;
    authType: "apiKey" | "bearer" | "none";
    keyName: string;
    models: string;
  }>({ id: "", name: "", baseUrl: "", authType: "apiKey", keyName: "Authorization", models: "" });
  const [headers, setHeaders] = React.useState<Array<{ key: string; value: string }>>([]);
  const [headerMask, setHeaderMask] = React.useState<boolean[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const CustomDefSchema = z.object({
    id: z.string().min(1, "ID is required"),
    name: z.string().min(1, "Name is required"),
    baseUrl: z.string().url("Base URL must be a valid URL"),
    authType: z.enum(["apiKey", "bearer", "none"]),
    keyName: z.string().optional(),
    models: z.string().min(1, "At least one model ID is required"),
    headers: z.array(z.object({ key: z.string().min(1), value: z.string() })).optional(),
  });

  React.useEffect(() => {
    // Keep mask array in sync with rows length (default to hidden)
    setHeaderMask((m) => {
      const next = m.slice();
      while (next.length < headers.length) next.push(true);
      if (next.length > headers.length) next.length = headers.length;
      return next;
    });
  }, [headers.length]);

  const addHeaderRow = () => {
    setHeaders((rows) => [...rows, { key: "", value: "" }]);
    setHeaderMask((m) => [...m, true]);
  };
  const removeHeaderRow = (idx: number) => {
    setHeaders((rows) => rows.filter((_, i) => i !== idx));
    setHeaderMask((m) => m.filter((_, i) => i !== idx));
  };
  const updateHeaderRow = (idx: number, field: "key" | "value", val: string) =>
    setHeaders((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));

  const addCustomProvider = async () => {
    // zod validate
    const parsed = CustomDefSchema.safeParse({
      ...newProv,
      headers,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as string;
        errs[path] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    const id = newProv.id.trim() || newProv.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const headerObj = headers.reduce<Record<string, string>>((acc, h) => {
      if (h.key.trim()) acc[h.key.trim()] = h.value;
      return acc;
    }, {});
    const modelList = newProv.models
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => ({ id }));

    const def: ProviderDefinition = {
      id,
      name: newProv.name || id,
      baseUrl: newProv.baseUrl.trim(),
      auth: { type: newProv.authType, keyName: newProv.keyName || undefined } as any,
      // Do not persist sensitive headers in plain provider JSON
      headers: undefined,
      models: modelList,
    };
    // Persist to localStorage
    const existingRaw = localStorage.getItem("bf_custom_providers");
    let list: ProviderDefinition[] = [];
    try { if (existingRaw) list = JSON.parse(existingRaw); } catch {}
    // Replace if id exists
    const idx = list.findIndex((p) => p.id === def.id);
    if (idx >= 0) list[idx] = def; else list.push(def);
    localStorage.setItem("bf_custom_providers", JSON.stringify(list));
    // Persist custom headers encrypted under per-provider key
    if (Object.keys(headerObj).length) {
      await saveEncrypted(`sec_provider_headers:${id}`, JSON.stringify(headerObj));
    }
    // Append to UI list with merged headers in-memory
    setProviders((prev) => [...prev, { def: { ...def, headers: Object.keys(headerObj).length ? headerObj : undefined }, key: "", status: "unknown" }]);
    // Reset form
    setNewProv({ id: "", name: "", baseUrl: "", authType: "apiKey", keyName: "Authorization", models: "" });
    setHeaders([]);
  };

  return (
    <div className="space-y-3" aria-label="Provider Manager">
      <div className="flex items-center justify-between">
        <div className="font-medium">Providers</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(v => !v)} aria-label="Providers help">?</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem("sec_help_providers");
              setShowHelp(false);
            }}
            aria-label="Reset Providers UI tips"
            title="Reset Providers UI tips"
          >
            Reset UI Tips
          </Button>
        </div>
      </div>
      {showHelp && (
        <div className="text-xs text-muted-foreground border rounded-md p-2">
          - Enter API keys for providers you use (stored encrypted in your browser).<br />
          - Validate to ensure the key works; Save to persist the key.<br />
          - You can clear a key by saving an empty value or from browser storage controls.<br />
          - Add a custom provider compatible with OpenAI chat API below.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map(p => {
          const builtins = new Set(["openrouter","ollama","groq","anthropic","gpt5"]);
          const isBuiltin = builtins.has(p.def.id);
          return (
            <Card key={p.def.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="font-semibold">{p.def.name}</span>
                  <StatusBadge status={p.status} />
                  {!isBuiltin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete custom provider"
                      aria-label={`Delete ${p.def.name}`}
                      onClick={async () => {
                        if (!confirm(`Delete provider '${p.def.name}'?`)) return;
                        // remove from local provider list
                        setProviders(prev => prev.filter(e => e.def.id !== p.def.id));
                        // remove from persisted bf_custom_providers
                        const raw = localStorage.getItem("bf_custom_providers");
                        try {
                          const list: ProviderDefinition[] = raw ? JSON.parse(raw) : [];
                          const filtered = list.filter((d: any) => d.id !== p.def.id);
                          localStorage.setItem("bf_custom_providers", JSON.stringify(filtered));
                        } catch {}
                        // remove encrypted headers and key
                        localStorage.removeItem(`sec_provider_headers:${p.def.id}`);
                        clearProviderKey(p.def.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </CardTitle>
                <div className="text-xs text-muted-foreground">{p.def.baseUrl}</div>
              </CardHeader>
              <CardContent className="flex items-end gap-2">
                {p.def.auth.type !== "none" ? (
                  <Input
                    aria-label={`${p.def.name} API key`}
                    placeholder={p.def.auth.type === "apiKey" ? "API Key" : "Bearer token"}
                    type="password"
                    value={p.key}
                    onChange={e => updateKey(p.def.id, e.currentTarget.value)}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">No key required</div>
                )}
                <Button
                  onClick={() => save(p)}
                  variant="secondary"
                  disabled={busy === p.def.id || (p.def.auth.type !== "none" && !p.key)}
                >
                  Save
                </Button>
                <Button
                  onClick={() => validate(p)}
                  disabled={busy === p.def.id || (p.def.auth.type !== "none" && !p.key)}
                  aria-busy={busy === p.def.id}
                >
                  {busy === p.def.id ? "Validating..." : "Validate"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-md border p-3 space-y-2">
        <div className="font-medium">Add Custom Provider (OpenAI-compatible)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <Input aria-label="Provider ID" placeholder="id (slug)" value={newProv.id} onChange={(e) => setNewProv(v => ({ ...v, id: e.currentTarget.value }))} />
            {errors.id && <div className="text-xs text-red-600 mt-1">{errors.id}</div>}
          </div>
          <div>
            <Input aria-label="Provider Name" placeholder="Display name" value={newProv.name} onChange={(e) => setNewProv(v => ({ ...v, name: e.currentTarget.value }))} />
            {errors.name && <div className="text-xs text-red-600 mt-1">{errors.name}</div>}
          </div>
          <div>
            <Input aria-label="Base URL" placeholder="https://api.example.com/v1" value={newProv.baseUrl} onChange={(e) => setNewProv(v => ({ ...v, baseUrl: e.currentTarget.value }))} />
            {errors.baseUrl && <div className="text-xs text-red-600 mt-1">{errors.baseUrl}</div>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="text-xs">
            Auth Type
            <select
              className="mt-1 w-full h-8 rounded-md border border-input px-2 text-sm"
              aria-label="Auth Type"
              value={newProv.authType}
              onChange={(e) => setNewProv(v => ({ ...v, authType: e.currentTarget.value as any }))}
            >
              <option value="apiKey">apiKey</option>
              <option value="bearer">bearer</option>
              <option value="none">none</option>
            </select>
          </label>
          <div>
            <Input aria-label="Auth header" placeholder="Header key (e.g., Authorization or x-api-key)" value={newProv.keyName} onChange={(e) => setNewProv(v => ({ ...v, keyName: e.currentTarget.value }))} />
          </div>
          <div>
            <Input aria-label="Models" placeholder="model-a,model-b" value={newProv.models} onChange={(e) => setNewProv(v => ({ ...v, models: e.currentTarget.value }))} />
            {errors.models && <div className="text-xs text-red-600 mt-1">{errors.models}</div>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Custom headers</div>
          <div className="space-y-2">
            {headers.map((h, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input aria-label={`Header key ${idx+1}`} placeholder="Header key" value={h.key} onChange={(e) => updateHeaderRow(idx, "key", e.currentTarget.value)} />
                <Input
                  aria-label={`Header value ${idx+1}`}
                  placeholder="Header value"
                  type={headerMask[idx] ? "password" : "text"}
                  value={h.value}
                  onChange={(e) => updateHeaderRow(idx, "value", e.currentTarget.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={headerMask[idx] ? "Show value" : "Hide value"}
                  title={headerMask[idx] ? "Show value" : "Hide value"}
                  onClick={() => setHeaderMask((m) => m.map((v, i) => (i === idx ? !v : v)))}
                >
                  {headerMask[idx] ? "👁️" : "🙈"}
                </Button>
                <Button variant="ghost" size="sm" aria-label="Remove header" title="Remove" onClick={() => removeHeaderRow(idx)}>Remove</Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" aria-label="Add header" onClick={addHeaderRow}>Add header</Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={addCustomProvider}
            disabled={!newProv.baseUrl.trim() || !newProv.name.trim()}
            aria-label="Add custom provider"
          >
            Add Provider
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Note: validation uses GET /models; streaming uses POST /chat/completions with stream=true.
        </div>
      </div>
    </div>
  );
}