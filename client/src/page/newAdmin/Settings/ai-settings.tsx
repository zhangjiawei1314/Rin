import { Alert, Button, Divider, Form, Input, Select, Switch } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { client } from "../../../app/runtime";
import {
  AI_MODEL_PRESETS,
  AI_PROVIDER_PRESETS,
  buildAIConfigDraftValue,
  buildAITestRequest,
  getAIProviderFields,
  getAIProviderPreset,
  type SettingsDraft,
} from "../../settings-helpers";

export function AISettingsPanel({
  draft,
  hasStoredAiApiKey,
  setConfigValue,
}: {
  draft: SettingsDraft;
  hasStoredAiApiKey: boolean;
  setConfigValue: (type: "client" | "server", key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    response?: string;
    error?: string;
    details?: string;
  } | null>(null);

  const value = buildAIConfigDraftValue(draft, hasStoredAiApiKey);
  const providerFields = getAIProviderFields(value.provider);
  const modelOptions = AI_MODEL_PRESETS[value.provider] || [];

  function handleProviderChange(nextProvider: string) {
    const preset = getAIProviderPreset(nextProvider);
    const models = AI_MODEL_PRESETS[nextProvider] || [];
    setConfigValue("server", "ai_summary.provider", nextProvider);
    setConfigValue("server", "ai_summary.api_url", preset?.url ?? "");
    setConfigValue("server", "ai_summary.model", models[0] ?? value.model);
  }

  async function handleTestModel() {
    setTestStatus("testing");
    setTestResult(null);
    try {
      const requestBody = buildAITestRequest({
        provider: value.provider,
        model: value.model,
        apiUrl: value.apiUrl,
        apiKey: value.apiKey,
      });
      const { data, error } = await client.config.testAI(requestBody);

      if (error) {
        setTestStatus("error");
        setTestResult({
          success: false,
          error: error.value || t("settings.ai_summary.test.failed"),
          details: t("settings.ai_summary.test.http_error$status", { status: error.status }),
        });
      } else if (data?.success) {
        setTestStatus("success");
        setTestResult({ success: true, response: data.response || t("settings.ai_summary.test.success") });
      } else {
        setTestStatus("error");
        setTestResult({
          success: false,
          error: data?.error || t("settings.ai_summary.test.failed"),
          details: data?.details,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestStatus("error");
      setTestResult({ success: false, error: msg || t("settings.ai_summary.test.error") });
    }
  }

  return (
    <Form layout="vertical" style={{ maxWidth: 640 }}>
      <Form.Item
        label={t("settings.ai_summary.enable.title")}
        extra={t("settings.ai_summary.enable.desc")}
      >
        <Switch
          checked={value.enabled}
          onChange={(checked) => setConfigValue("server", "ai_summary.enabled", checked)}
        />
      </Form.Item>

      {value.enabled && (
        <>
          <Divider />
          <Form.Item
            label={t("settings.ai_summary.provider.title")}
            extra={t("settings.ai_summary.provider.desc")}
          >
            <Select
              value={value.provider}
              onChange={handleProviderChange}
              options={AI_PROVIDER_PRESETS.map((preset) => ({
                label: preset.label,
                value: preset.value,
              }))}
            />
          </Form.Item>

          <Form.Item label={t("settings.ai_summary.model.title")} extra={t("settings.ai_summary.model.desc")}>
            <Select
              value={value.model}
              onChange={(next) => setConfigValue("server", "ai_summary.model", next)}
              options={modelOptions.map((m) => ({ label: m, value: m }))}
              showSearch
            />
          </Form.Item>

          {providerFields.requiresApiKey && (
            <Form.Item label={t("settings.ai_summary.api_key.title")}>
              <Input.Password
                value={value.apiKey}
                autoComplete="new-password"
                placeholder={value.apiKeySet ? t("settings.ai_summary.api_key.placeholder_set") : "sk-..."}
                onChange={(e) => setConfigValue("server", "ai_summary.api_key", e.target.value)}
              />
            </Form.Item>
          )}

          {providerFields.requiresApiUrl && (
            <Form.Item label={t("settings.ai_summary.api_url.title")}>
              <Input
                value={value.apiUrl}
                placeholder="https://api.openai.com/v1"
                onChange={(e) => setConfigValue("server", "ai_summary.api_url", e.target.value)}
              />
            </Form.Item>
          )}

          <Divider />
          <Form.Item label={t("settings.ai_summary.test.title")} extra={t("settings.ai_summary.test.desc")}>
            <Button onClick={handleTestModel} loading={testStatus === "testing"}>
              {t("settings.ai_summary.test.button")}
            </Button>
          </Form.Item>

          {testStatus === "success" && testResult?.response && (
            <Alert type="success" showIcon message={t("settings.ai_summary.test.success")} description={testResult.response} />
          )}
          {testStatus === "error" && testResult && (
            <Alert
              type="error"
              showIcon
              message={testResult.error || t("settings.ai_summary.test.failed")}
              description={testResult.details}
            />
          )}
        </>
      )}
    </Form>
  );
}