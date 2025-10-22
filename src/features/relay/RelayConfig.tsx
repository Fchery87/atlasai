import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  getRelayConfig,
  saveRelayConfig,
  type RelayConfig,
} from "../../lib/relay/client";

/**
 * Relay configuration panel
 *
 * Allows users to optionally enable an LLM relay server for their requests.
 * This is completely optional - by default all requests go directly from browser to LLM providers.
 */
export function RelayConfigPanel() {
  const [config, setConfig] = React.useState<RelayConfig>(getRelayConfig());
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = () => {
    saveRelayConfig(config);
    setTestResult({
      success: true,
      message: "Relay configuration saved successfully.",
    });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTest = async () => {
    if (!config.endpoint) {
      setTestResult({
        success: false,
        message: "Please enter a relay endpoint URL.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Simple health check
      const response = await fetch(config.endpoint, {
        method: "OPTIONS", // CORS preflight
      });

      if (response.ok || response.status === 204) {
        setTestResult({
          success: true,
          message: "Relay endpoint is reachable.",
        });
      } else {
        setTestResult({
          success: false,
          message: `Relay returned status ${response.status}.`,
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">LLM Relay (Optional)</CardTitle>
          <Badge variant={config.enabled ? "success" : "secondary"}>
            {config.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>What is this?</strong> An optional proxy server for LLM
            requests.
          </p>
          <p>
            <strong>Why use it?</strong> Hides API keys from browser network
            tab, enables centralized rate limiting and monitoring.
          </p>
          <p>
            <strong>Note:</strong> Still requires your API key (BYOK model).
            Adds latency.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) =>
                setConfig({ ...config, enabled: e.currentTarget.checked })
              }
            />
            Enable LLM Relay
          </label>

          <div className="space-y-1">
            <label className="text-xs font-medium">Relay Endpoint URL</label>
            <Input
              type="url"
              placeholder="https://relay.yourdomain.com/llm/relay"
              value={config.endpoint}
              onChange={(e) =>
                setConfig({ ...config, endpoint: e.currentTarget.value })
              }
              disabled={!config.enabled}
            />
          </div>

          {testResult && (
            <div
              className={`text-xs p-2 rounded ${
                testResult.success
                  ? "bg-green-50 text-green-900 border border-green-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleTest}
              disabled={!config.enabled || !config.endpoint || testing}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            <Button size="sm" variant="default" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-2">
          <p className="font-medium mb-1">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Deploy the relay worker (see <code>worker/llm-relay.ts</code>)
            </li>
            <li>
              Use <code>wrangler deploy</code> to deploy to Cloudflare Workers
            </li>
            <li>Enter the deployed worker URL above</li>
            <li>Enable and test the connection</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
