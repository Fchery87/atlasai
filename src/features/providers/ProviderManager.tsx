import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { ProviderDefinition } from "../../lib/providers/types";
import { OpenRouterDef, OpenRouterAdapter } from "../../lib/providers/openrouter";
import { OllamaDef, OllamaAdapter } from "../../lib/providers/ollama";
import { loadProviderKey, saveProviderKey, clearProviderKey } from "../../lib/crypto/keys";
import { loadDecrypted, saveEncrypted } from "../../lib/oauth/github";

type ProviderEntry = {
  def: ProviderDefinition;
  key: string;
  status?: "unknown" | "valid" | "invalid";
  message?: string;
};

const initialProviders: ProviderEntry[] = [
  { def: OpenRouterDef, key: "", status: "unknown" },
  { def: OllamaDef, key: "", status: "unknown" },
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
    // Load encrypted keys from storage
    (async () => {
      const entries = await Promise.all(
        initialProviders.map(async (p) => {
          const { plaintext } = await loadProviderKey(p.def.id);
          return { ...p, key: plaintext || "" };
        })
      );
      setProviders(entries);
      const help = await loadDecrypted("sec_help_providers");
      setShowHelp(help === "1");
    })();
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
          - You can clear a key by saving an empty value or from browser storage controls.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map(p => (
          <Card key={p.def.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="font-semibold">{p.def.name}</span>
                <StatusBadge status={p.status} />
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
        ))}
      </div>
    </div>
  );
}