import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Spin, Switch, Tabs, theme } from "antd";
import { App as AntApp } from "antd";
import type { ChangeEvent } from "react";
import { client, oauth_url } from "../../../app/runtime";
import { useTranslation } from "react-i18next";
import { AntdAdminLayout } from "../../../components/ui/admin-layout";
import { HealthPage } from "../../health";
import { CompatTasksPage } from "../../compat-tasks";
import {
  HEADER_BEHAVIOR_OPTIONS,
  HEADER_LAYOUT_OPTIONS,
  normalizeHeaderBehavior,
  normalizeHeaderLayout,
} from "../../../components/site-header/layout-options";
import { HeaderLayoutPreview } from "../../../components/site-header/layout-preview";
import { FEED_CARD_VARIANTS, normalizeFeedCardVariant } from "../../../components/feed-card-options";
import { FeedCardPreview } from "../../../components/feed-card-preview";
import { FEED_LAYOUT_OPTIONS, normalizeFeedLayout } from "../../../components/feed-layout-options";
import { applyThemeColor, normalizeThemeColor } from "../../../utils/theme-color";
import { AISettingsPanel } from "./ai-settings";
import {
  areSettingsDraftsEqual,
  createSettingsConfigWrappers,
  importWordPressFile,
  loadSettingsConfigState,
  mergeSessionConfig,
  saveSettingsConfigState,
  type SettingsDraft,
  updateDraftConfig,
  uploadFavicon,
} from "../../settings-helpers";

const THEME_COLOR_OPTIONS = [
  { label: "Rose", value: "#fc466b" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Blue", value: "#2563eb" },
  { label: "Teal", value: "#0f766e" },
  { label: "Orange", value: "#ea580c" },
];

const WEBHOOK_METHOD_OPTIONS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const { token } = theme.useToken();

  const [draft, setDraft] = useState<SettingsDraft>({ clientConfig: {}, serverConfig: {} });
  const [initialDraft, setInitialDraft] = useState<SettingsDraft>({ clientConfig: {}, serverConfig: {} });
  const [hasStoredAiApiKey, setHasStoredAiApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestMessage, setWebhookTestMessage] = useState("");

  const loadedRef = useRef(false);
  const initialDraftRef = useRef<SettingsDraft>({ clientConfig: {}, serverConfig: {} });

  function getDraftThemeColor(nextDraft: SettingsDraft) {
    return typeof nextDraft.clientConfig["theme.color"] === "string"
      ? nextDraft.clientConfig["theme.color"]
      : undefined;
  }

  useEffect(() => {
    if (loadedRef.current) return;
    loadSettingsConfigState()
      .then((state) => {
        setDraft(state.draft);
        setInitialDraft(state.draft);
        initialDraftRef.current = state.draft;
        setHasStoredAiApiKey(state.hasStoredAiApiKey);
        mergeSessionConfig(state.draft.clientConfig);
        applyThemeColor(getDraftThemeColor(state.draft));
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        message.error(t("settings.get_config_failed$message", { message: msg }));
      })
      .finally(() => setLoading(false));
    loadedRef.current = true;

    return () => {
      applyThemeColor(getDraftThemeColor(initialDraftRef.current));
    };
  }, [message, t]);

  const { clientConfig, serverConfig } = useMemo(
    () => createSettingsConfigWrappers(draft),
    [draft],
  );
  const hasUnsavedChanges = !areSettingsDraftsEqual(draft, initialDraft);

  function setConfigValue(type: "client" | "server", key: string, value: unknown) {
    setDraft((current) => updateDraftConfig(current, type, key, value));
  }

  function handleReset() {
    setDraft(initialDraft);
    applyThemeColor(getDraftThemeColor(initialDraft));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const state = await saveSettingsConfigState(draft);
      setDraft(state.draft);
      setInitialDraft(state.draft);
      initialDraftRef.current = state.draft;
      setHasStoredAiApiKey(state.hasStoredAiApiKey);
      mergeSessionConfig(state.draft.clientConfig);
      window.dispatchEvent(new Event("storage"));
      message.success(t("settings.ai_summary.save_success"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(t("settings.update_failed$message", { message: msg }));
    } finally {
      setSaving(false);
    }
  }

  async function handleFaviconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadFavicon(file, t, (m) => message.success(m));
  }

  async function handleWordPressImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data, error } = await importWordPressFile(file);
    if (data) {
      message.success(
        t("settings.import_success$success$skipped", { success: data.imported, skipped: 0 }),
      );
    } else if (error) {
      message.error(t("settings.import_failed$message", { message: error.value }));
    }
  }

  async function handleTestWebhook() {
    setTestingWebhook(true);
    try {
      const { data, error } = await client.config.testWebhook({
        webhook_url: String(serverConfig.get("webhook_url") ?? ""),
        "webhook.method": String(serverConfig.get("webhook.method") ?? ""),
        "webhook.content_type": String(serverConfig.get("webhook.content_type") ?? ""),
        "webhook.headers": String(serverConfig.get("webhook.headers") ?? ""),
        "webhook.body_template": String(serverConfig.get("webhook.body_template") ?? ""),
        test_message: webhookTestMessage,
      });

      if (error || !data?.success) {
        const msg = error?.value || data?.error || t("settings.webhook.test.failed");
        const details = data?.details ? `\n${data.details}` : "";
        message.error(`${msg}${details}`);
        return;
      }
      message.success(t("settings.webhook.test.success"));
    } finally {
      setTestingWebhook(false);
    }
  }

  const items = [
    {
      key: "site",
      label: t("settings.site.title"),
      children: (
        <SiteSettingsTab clientConfig={clientConfig} setConfigValue={setConfigValue} />
      ),
    },
    {
      key: "personalization",
      label: t("settings.personalization.title"),
      children: (
        <PersonalizationTab
          clientConfig={clientConfig}
          setConfigValue={setConfigValue}
        />
      ),
    },
    {
      key: "features",
      label: t("settings.other.title"),
      children: (
        <FeaturesTab
          clientConfig={clientConfig}
          setConfigValue={setConfigValue}
          onFaviconChange={handleFaviconChange}
          onWordPressImport={handleWordPressImport}
        />
      ),
    },
    {
      key: "webhook",
      label: t("settings.webhook.title"),
      children: (
        <WebhookTab
          serverConfig={serverConfig}
          setConfigValue={setConfigValue}
          testingWebhook={testingWebhook}
          webhookTestMessage={webhookTestMessage}
          onTestMessageChange={setWebhookTestMessage}
          onTestWebhook={handleTestWebhook}
        />
      ),
    },
    {
      key: "friend",
      label: t("settings.friend.title"),
      children: (
        <FriendTab
          clientConfig={clientConfig}
          serverConfig={serverConfig}
          setConfigValue={setConfigValue}
        />
      ),
    },
    {
      key: "maintenance",
      label: t("settings.maintenance.title"),
      children: (
        <MaintenanceTab clientConfig={clientConfig} setConfigValue={setConfigValue} />
      ),
    },
    {
      key: "ai",
      label: t("settings.ai_summary.title"),
      children: (
        <AISettingsPanel
          draft={draft}
          hasStoredAiApiKey={hasStoredAiApiKey}
          setConfigValue={setConfigValue}
        />
      ),
    },
    {
      key: "health",
      label: t("health.title"),
      children: <HealthPage />,
    },
    {
      key: "compat-tasks",
      label: t("compat_tasks.title"),
      children: <CompatTasksPage />,
    },
  ];

  return (
    <AntdAdminLayout>
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
            <p className="mt-2 text-gray-500">{t("admin.settings_description")}</p>
          </div>
          {hasUnsavedChanges && (
            <Space>
              <Button onClick={handleReset} disabled={saving}>
                {t("reset")}
              </Button>
              <Button type="primary" onClick={handleSave} loading={saving} disabled={loading}>
                {t("save")}
              </Button>
            </Space>
          )}
        </div>

        {hasUnsavedChanges && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={t("settings.ai_summary.unsaved_changes")}
          />
        )}

        <Spin spinning={loading}>
          <Card variant="borderless" style={{ borderColor: token.colorBorderSecondary }}>
            <Tabs items={items} defaultActiveKey="site" tabPosition="top" />
          </Card>
        </Spin>
      </div>
    </AntdAdminLayout>
  );
}

function SiteSettingsTab({
  clientConfig,
  setConfigValue,
}: {
  clientConfig: ReturnType<typeof createSettingsConfigWrappers>["clientConfig"];
  setConfigValue: (type: "client" | "server", key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <Form layout="vertical" style={{ maxWidth: 640 }}>
      <Form.Item label={t("settings.site.name.title")} extra={t("settings.site.name.desc")}>
        <Input
          value={String(clientConfig.get("site.name") ?? "")}
          placeholder={String(clientConfig.default("site.name") ?? "")}
          onChange={(e) => setConfigValue("client", "site.name", e.target.value)}
        />
      </Form.Item>
      <Form.Item label={t("settings.site.description.title")} extra={t("settings.site.description.desc")}>
        <Input.TextArea
          value={String(clientConfig.get("site.description") ?? "")}
          placeholder={String(clientConfig.default("site.description") ?? "")}
          onChange={(e) => setConfigValue("client", "site.description", e.target.value)}
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Form.Item>
      <Form.Item label={t("settings.site.avatar.title")} extra={t("settings.site.avatar.desc")}>
        <Input
          value={String(clientConfig.get("site.avatar") ?? "")}
          placeholder="https://..."
          onChange={(e) => setConfigValue("client", "site.avatar", e.target.value)}
        />
      </Form.Item>
      <Form.Item label={t("settings.site.page_size.title")} extra={t("settings.site.page_size.desc")}>
        <InputNumber
          min={1}
          value={Number(clientConfig.get("site.page_size") ?? 5)}
          onChange={(v) => setConfigValue("client", "site.page_size", v ?? 5)}
        />
      </Form.Item>
    </Form>
  );
}

function PersonalizationTab({
  clientConfig,
  setConfigValue,
}: {
  clientConfig: ReturnType<typeof createSettingsConfigWrappers>["clientConfig"];
  setConfigValue: (type: "client" | "server", key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  const themeColorValue = normalizeThemeColor(String(clientConfig.get("theme.color") ?? "#fc466b"));
  const feedLayoutValue = normalizeFeedLayout(String(clientConfig.get("feed.layout") ?? "list"));
  const feedCardVariantValue = normalizeFeedCardVariant(String(clientConfig.get("feed.card_variant") ?? "default"));
  const headerLayoutValue = normalizeHeaderLayout(String(clientConfig.get("header.layout") ?? "classic"));
  const headerBehaviorValue = normalizeHeaderBehavior(String(clientConfig.get("header.behavior") ?? "fixed"));
  const previewSiteName = String(clientConfig.get("site.name") ?? clientConfig.default("site.name") ?? "Rin");
  const previewSiteAvatar = String(clientConfig.get("site.avatar") ?? clientConfig.default("site.avatar") ?? "");

  return (
    <div className="flex flex-col gap-6">
      {/* 头部布局 — 可视化预览 */}
      <section>
        <SettingsSectionLabel
          title={t("settings.header_layout.title")}
          description={t("settings.header_layout.desc")}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {HEADER_LAYOUT_OPTIONS.map((value) => (
            <HeaderLayoutPreview
              key={value}
              data={{
                avatar: previewSiteAvatar,
                name: previewSiteName,
                themeColor: themeColorValue,
              }}
              layout={value}
              selected={headerLayoutValue === value}
              title={t(`settings.header_layout.options.${value}`)}
              description={t(`settings.header_layout.preview.${value}`)}
              onClick={() => setConfigValue("client", "header.layout", value)}
            />
          ))}
        </div>
      </section>

      {/* 头部行为 */}
      <section>
        <SettingsSectionLabel
          title={t("settings.header_behavior.title")}
          description={t("settings.header_behavior.desc")}
        />
        <div className="flex flex-wrap gap-3">
          {HEADER_BEHAVIOR_OPTIONS.map((value) => {
            const selected = headerBehaviorValue === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setConfigValue("client", "header.behavior", value)}
                className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                  selected
                    ? "border-theme bg-theme/5 shadow-sm shadow-theme/10 text-theme"
                    : "border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
                }`}
              >
                {t(`settings.header_behavior.options.${value}`)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Feed 布局 */}
      <section>
        <SettingsSectionLabel
          title={t("settings.feed_layout.title")}
          description={t("settings.feed_layout.desc")}
        />
        <div className="flex flex-wrap gap-3">
          {FEED_LAYOUT_OPTIONS.map((value) => {
            const selected = feedLayoutValue === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setConfigValue("client", "feed.layout", value)}
                className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                  selected
                    ? "border-theme bg-theme/5 shadow-sm shadow-theme/10 text-theme"
                    : "border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
                }`}
              >
                {t(`settings.feed_layout.options.${value}`)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Feed 卡片 — 可视化预览 */}
      <section>
        <SettingsSectionLabel
          title={t("settings.feed_card.title")}
          description={t("settings.feed_card.desc")}
        />
        <div className="grid gap-3 md:grid-cols-2">
          {FEED_CARD_VARIANTS.map((value) => (
            <FeedCardPreview
              key={value}
              variant={value}
              selected={feedCardVariantValue === value}
              title={t(`settings.feed_card.options.${value}`)}
              description={t(`settings.feed_card.preview.${value}`)}
              onClick={() => setConfigValue("client", "feed.card_variant", value)}
            />
          ))}
        </div>
      </section>

      {/* 主题色 */}
      <section>
        <SettingsSectionLabel
          title={t("settings.theme_color.title")}
          description={t("settings.theme_color.desc")}
        />
        <div className="flex flex-wrap gap-3">
          {THEME_COLOR_OPTIONS.map((option) => {
            const selected = themeColorValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setConfigValue("client", "theme.color", option.value);
                  applyThemeColor(option.value);
                }}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                  selected
                    ? "border-theme bg-theme/5 shadow-sm shadow-theme/10"
                    : "border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
                }`}
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10 dark:border-white/10"
                  style={{ backgroundColor: option.value }}
                />
                <span className="text-sm t-primary">
                  {t(`settings.theme_color.options.${option.label.toLowerCase()}`)}
                </span>
                {selected ? <i className="ri-check-line text-theme" /> : null}
              </button>
            );
          })}
          <label className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20">
            <input
              type="color"
              value={themeColorValue}
              onChange={(event) => {
                const normalized = normalizeThemeColor(event.target.value);
                setConfigValue("client", "theme.color", normalized);
                applyThemeColor(normalized);
              }}
              className="color-input-reset h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
            <span className="text-sm t-primary">{t("settings.theme_color.custom")}</span>
          </label>
        </div>
      </section>
    </div>
  );
}

function SettingsSectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <p className="text-base font-semibold t-primary">{title}</p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
    </div>
  );
}

function FeaturesTab({
  clientConfig,
  setConfigValue,
  onFaviconChange,
  onWordPressImport,
}: {
  clientConfig: ReturnType<typeof createSettingsConfigWrappers>["clientConfig"];
  setConfigValue: (type: "client" | "server", key: string, value: unknown) => void;
  onFaviconChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onWordPressImport: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <Form layout="vertical" style={{ maxWidth: 640 }}>
      <Form.Item label={t("settings.login.enable.title")} extra={t("settings.login.enable.desc", { url: oauth_url })}>
        <Switch
          checked={clientConfig.getBoolean("login.enabled")}
          onChange={(checked) => setConfigValue("client", "login.enabled", checked)}
        />
      </Form.Item>
      <Form.Item label={t("settings.comment.enable.title")} extra={t("settings.comment.enable.desc")}>
        <Switch
          checked={clientConfig.getBoolean("comment.enabled")}
          onChange={(checked) => setConfigValue("client", "comment.enabled", checked)}
        />
      </Form.Item>
      <Form.Item label={t("settings.counter.enable.title")} extra={t("settings.counter.enable.desc")}>
        <Switch
          checked={clientConfig.getBoolean("counter.enabled")}
          onChange={(checked) => setConfigValue("client", "counter.enabled", checked)}
        />
      </Form.Item>
      <Form.Item label={t("settings.rss.title")} extra={t("settings.rss.desc")}>
        <Switch
          checked={clientConfig.getBoolean("rss")}
          onChange={(checked) => setConfigValue("client", "rss", checked)}
        />
      </Form.Item>
      <Form.Item label={t("settings.footer.title")} extra={t("settings.footer.desc")}>
        <Input.TextArea
          value={String(clientConfig.get("footer") ?? "")}
          onChange={(e) => setConfigValue("client", "footer", e.target.value)}
          autoSize={{ minRows: 2, maxRows: 6 }}
        />
      </Form.Item>
      <Form.Item label={t("settings.favicon.title")} extra={t("settings.favicon.desc")}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={onFaviconChange}
        />
      </Form.Item>
      <Form.Item label={t("settings.wordpress.title")} extra={t("settings.wordpress.desc")}>
        <input type="file" accept="application/xml" onChange={onWordPressImport} />
      </Form.Item>
    </Form>
  );
}

function WebhookTab({
  serverConfig,
  setConfigValue,
  testingWebhook,
  webhookTestMessage,
  onTestMessageChange,
  onTestWebhook,
}: {
  serverConfig: ReturnType<typeof createSettingsConfigWrappers>["serverConfig"];
  setConfigValue: (type: "client" | "server", key: string, value: unknown) => void;
  testingWebhook: boolean;
  webhookTestMessage: string;
  onTestMessageChange: (v: string) => void;
  onTestWebhook: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Form layout="vertical" style={{ maxWidth: 640 }}>
      <Form.Item label={t("settings.webhook.url.title")} extra={t("settings.webhook.url.desc")}>
        <Input
          value={String(serverConfig.get("webhook_url") ?? "")}
          placeholder="https://example.com/webhook"
          onChange={(e) => setConfigValue("server", "webhook_url", e.target.value)}
        />
      </Form.Item>
      <Form.Item label={t("settings.webhook.method.title")} extra={t("settings.webhook.method.desc")}>
        <Select
          value={String(serverConfig.get("webhook.method") ?? "")}
          onChange={(v) => setConfigValue("server", "webhook.method", v)}
          options={WEBHOOK_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
          allowClear
        />
      </Form.Item>
      <Form.Item label={t("settings.webhook.content_type.title")} extra={t("settings.webhook.content_type.desc")}>
        <Input
          value={String(serverConfig.get("webhook.content_type") ?? "")}
          placeholder={String(serverConfig.default("webhook.content_type") ?? "application/json")}
          onChange={(e) => setConfigValue("server", "webhook.content_type", e.target.value)}
        />
      </Form.Item>
      <Form.Item label={t("settings.webhook.headers.title")} extra={t("settings.webhook.headers.desc")}>
        <Input.TextArea
          value={String(serverConfig.get("webhook.headers") ?? "")}
          placeholder='{"Authorization": "Bearer ..."}'
          onChange={(e) => setConfigValue("server", "webhook.headers", e.target.value)}
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Form.Item>
      <Form.Item label={t("settings.webhook.body_template.title")} extra={t("settings.webhook.body_template.desc")}>
        <Input.TextArea
          value={String(serverConfig.get("webhook.body_template") ?? "")}
          onChange={(e) => setConfigValue("server", "webhook.body_template", e.target.value)}
          autoSize={{ minRows: 2, maxRows: 6 }}
        />
      </Form.Item>
      <Form.Item label={t("settings.webhook.test.title")} extra={t("settings.webhook.test.desc")}>
        <Input.TextArea
          value={webhookTestMessage}
          placeholder={t("settings.webhook.test.placeholder")}
          onChange={(e) => onTestMessageChange(e.target.value)}
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
        <Button
          style={{ marginTop: 8 }}
          onClick={onTestWebhook}
          loading={testingWebhook}
        >
          {t("settings.webhook.test.button")}
        </Button>
      </Form.Item>
    </Form>
  );
}

function FriendTab({
  clientConfig,
  serverConfig,
  setConfigValue,
}: {
  clientConfig: ReturnType<typeof createSettingsConfigWrappers>["clientConfig"];
  serverConfig: ReturnType<typeof createSettingsConfigWrappers>["serverConfig"];
  setConfigValue: (type: "client" | "server", key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <Form layout="vertical" style={{ maxWidth: 640 }}>
      <Form.Item label={t("settings.friend.apply.title")} extra={t("settings.friend.apply.desc")}>
        <Switch
          checked={Boolean(clientConfig.get("friend_apply_enable"))}
          onChange={(checked) => setConfigValue("client", "friend_apply_enable", checked)}
        />
      </Form.Item>
      <Form.Item label={t("settings.friend.health.title")} extra={t("settings.friend.health.desc")}>
        <Switch
          checked={Boolean(serverConfig.get("friend_crontab"))}
          onChange={(checked) => setConfigValue("server", "friend_crontab", checked)}
        />
      </Form.Item>
      <Form.Item label={t("settings.friend.health.ua.title")} extra={t("settings.friend.health.ua.desc")}>
        <Input
          value={String(serverConfig.get("friend_ua") ?? "")}
          placeholder={String(serverConfig.default("friend_ua") ?? "User-Agent")}
          onChange={(e) => setConfigValue("server", "friend_ua", e.target.value)}
        />
      </Form.Item>
    </Form>
  );
}

function MaintenanceTab({
  clientConfig,
  setConfigValue,
}: {
  clientConfig: ReturnType<typeof createSettingsConfigWrappers>["clientConfig"];
  setConfigValue: (type: "client" | "server", key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();

  async function handleClearCache() {
    const { error } = await client.config.clearCache();
    if (error) {
      message.error(t("settings.cache.clear_failed$message", { message: error.value }));
    } else {
      message.success(t("clear"));
    }
  }

  return (
    <Form layout="vertical" style={{ maxWidth: 640 }}>
      <Form.Item label={t("settings.cache.enabled.title")} extra={t("settings.cache.enabled.desc")}>
        <Switch
          checked={clientConfig.getBoolean("cache.enabled")}
          onChange={(checked) => setConfigValue("client", "cache.enabled", checked)}
        />
      </Form.Item>
      <Form.Item label={t("settings.cache.clear.title")} extra={t("settings.cache.clear.desc")}>
        <Button danger onClick={handleClearCache}>
          {t("clear")}
        </Button>
      </Form.Item>
    </Form>
  );
}