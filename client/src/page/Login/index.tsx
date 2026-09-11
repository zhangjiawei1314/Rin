import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button, ConfigProvider, Form, Input, Segmented, theme } from "antd";
import { GithubOutlined, LockOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { client, oauth_url } from "../../app/runtime";
import { setAuthToken } from "../../utils/auth";
import { getLoginRedirectPath } from "../../utils/auth-redirect";

type Mode = "login" | "register";

interface RegisterValues {
  username: string;
  password: string;
  confirm: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [authStatus, setAuthStatus] = useState<{ github: boolean; password: boolean }>({
    github: false,
    password: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    client.auth.status().then(({ data }) => {
      if (data) {
        setAuthStatus(data);
      }
    });
  }, []);

  const finishAuth = (token?: string) => {
    if (token) {
      setAuthToken(token);
    }
    setLocation(getLoginRedirectPath(window.location.search));
    window.location.reload();
  };

  const handleLogin = async (values: { username: string; password: string }) => {
    setIsLoading(true);
    setError("");

    try {
      const { data, error: apiError } = await client.auth.login(values);

      if (apiError) {
        // Check if the error is about frozen account
        if (apiError.value === 'Account is frozen') {
          setError('账号已冻结请联系管理员');
        } else {
          setError(t("login.error.invalid"));
        }
        return;
      }
      if (data?.success) {
        finishAuth(data.token);
      } else {
        setError(t("login.error.failed"));
      }
    } catch {
      setError(t("login.error.network"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    setIsLoading(true);
    setError("");

    try {
      const { data, error: apiError } = await client.auth.register({
        username: values.username,
        password: values.password,
      });

      if (apiError) {
        const raw = String(apiError.value ?? "");
        const message = raw.includes("already exists") || raw.includes("not available")
          ? t("login.error.username_taken")
          : raw.includes("at least 6")
            ? t("login.error.weak_password")
            : raw.includes("at least 2")
              ? t("login.error.username_short")
              : t("login.error.failed");
        setError(message);
        return;
      }
      if (data?.success) {
        finishAuth(data.token);
      } else {
        setError(t("login.error.failed"));
      }
    } catch {
      setError(t("login.error.network"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 select-none"
      style={{
        background: "radial-gradient(circle at 50% 30%, #0b1528 0%, #030712 70%, #02040a 100%)",
      }}
    >
      {/* High-tech Grid Background Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
      />

      {/* Futuristic Ambient Glow Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Cyber Center HUD Container */}
      <div className="relative w-full max-w-[420px]">
        {/* HUD Outer Corner Accents */}
        <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 z-20 pointer-events-none" />
        <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 z-20 pointer-events-none" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 z-20 pointer-events-none" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 z-20 pointer-events-none" />

        {/* HUD Glass Card */}
        <div
          className="relative overflow-hidden rounded-xl border border-cyan-500/20 shadow-[0_0_60px_-15px_rgba(6,182,212,0.25)]"
          style={{
            background: "rgba(10, 16, 31, 0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Glowing Top Scanline Accent */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          {/* Telemetry Status Bar */}
          <div className="flex items-center justify-between border-b border-cyan-500/10 px-5 py-2.5 bg-slate-950/40 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-cyan-400 font-medium tracking-wider">SYS.GATEWAY</span>
            </div>
            <div className="text-slate-500 tracking-widest text-[10px]">
              PROTOCOL // TLS_1.3
            </div>
          </div>

          <div className="p-7">
            {/* Header Branding */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono tracking-widest uppercase mb-3">
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                AUTHENTICATION
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
                  {t("login.title")}
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono tracking-wide">
                {t("login.sign_in_hint")}
              </p>
            </div>

            <ConfigProvider
              theme={{
                algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
                token: {
                  colorPrimary: "#06b6d4",
                  colorBgContainer: "rgba(15, 23, 42, 0.65)",
                  colorBgElevated: "rgba(15, 23, 42, 0.85)",
                  colorBgLayout: "rgba(15, 23, 42, 0.65)",
                  colorBorder: "rgba(56, 189, 248, 0.22)",
                  colorText: "#f8fafc",
                  colorTextPlaceholder: "#64748b",
                  borderRadius: 8,
                  controlHeightLG: 44,
                  fontSize: 14,
                },
                components: {
                  Input: {
                    activeBorderColor: "#38bdf8",
                    hoverBorderColor: "rgba(56, 189, 248, 0.5)",
                    activeShadow: "0 0 12px rgba(56, 189, 248, 0.25)",
                    colorBgContainer: "rgba(15, 23, 42, 0.65)",
                    colorBgBase: "rgba(15, 23, 42, 0.65)",
                  },
                  Form: {
                    itemMarginBottom: 16,
                  },
                  Button: {
                    colorPrimary: "#06b6d4",
                    colorPrimaryHover: "#38bdf8",
                    colorPrimaryActive: "#0891b2",
                  },
                  Segmented: {
                    colorBgLayout: "rgba(15, 23, 42, 0.8)",
                    colorBgElevated: "rgba(6, 182, 212, 0.25)",
                    itemColor: "#94a3b8",
                    itemSelectedColor: "#38bdf8",
                  },
                },
              }}
            >
              {/* High-tech Segmented Switcher */}
              <div className="mb-6 p-0.5 rounded-lg border border-cyan-500/20 bg-slate-950/50">
                <Segmented
                  block
                  value={mode}
                  onChange={(value) => {
                    setMode(value as Mode);
                    setError("");
                  }}
                  options={[
                    {
                      label: (
                        <span className="font-mono text-xs tracking-wider">
                          {t("login.mode.login")}
                        </span>
                      ),
                      value: "login",
                    },
                    {
                      label: (
                        <span className="font-mono text-xs tracking-wider">
                          {t("login.mode.register")}
                        </span>
                      ),
                      value: "register",
                    },
                  ]}
                />
              </div>

              {/* Error Toast Banner */}
              {error && (
                <div className="mb-5 rounded-lg px-3.5 py-2.5 text-xs font-mono flex items-center gap-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-shake">
                  <WarningOutlined className="text-rose-400 text-sm flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {mode === "login" ? (
                <LoginFormPanel
                  authStatus={authStatus}
                  isLoading={isLoading}
                  onFinish={handleLogin}
                />
              ) : (
                <RegisterFormPanel isLoading={isLoading} onFinish={handleRegister} />
              )}
            </ConfigProvider>
          </div>

          {/* HUD Footer Telemetry */}
          <div className="border-t border-cyan-500/10 px-5 py-2 bg-slate-950/50 text-center font-mono text-[10px] text-slate-500 flex items-center justify-between">
            <span>SECURED BY RIN</span>
            <span className="text-cyan-500/60">[ 0x4F8A ]</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFormPanel({
  authStatus,
  isLoading,
  onFinish,
}: {
  authStatus: { github: boolean; password: boolean };
  isLoading: boolean;
  onFinish: (values: { username: string; password: string }) => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ username: string; password: string }>();

  return (
    <>
      {authStatus.password && (
        <Form<{ username: string; password: string }>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t("login.error.empty") }]}
            className="mb-4"
          >
            <Input
              prefix={<UserOutlined className="text-cyan-400/80 mr-1" />}
              placeholder={t("login.username.placeholder")}
              allowClear
              autoFocus
              size="large"
              className="font-mono text-xs"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t("login.error.empty") }]}
            className="mb-6"
          >
            <Input.Password
              prefix={<LockOutlined className="text-cyan-400/80 mr-1" />}
              placeholder={t("login.password.placeholder")}
              size="large"
              className="font-mono text-xs"
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              size="large"
              className="font-mono text-xs tracking-wider h-11 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 border-0 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-300 active:scale-[0.98]"
            >
              {isLoading ? t("login.loading") : t("login.title")}
            </Button>
          </Form.Item>
        </Form>
      )}

      {authStatus.github && (
        <div className="mt-5">
          {authStatus.password && (
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">{t("login.or")}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            </div>
          )}
          {!authStatus.password && (
            <p className="mb-3 text-xs font-mono text-slate-400">
              {t("login.oauth_only")}
            </p>
          )}
          <Button
            block
            size="large"
            icon={<GithubOutlined className="text-base" />}
            onClick={() => {
              window.location.href = oauth_url;
            }}
            className="font-mono text-xs h-11 border-slate-700/80 bg-slate-900/60 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-200 transition-all duration-200"
          >
            {t("github_login")}
          </Button>
        </div>
      )}

      {!authStatus.github && !authStatus.password && (
        <p className="font-mono text-xs text-rose-400 text-center py-2">{t("login.no_methods")}</p>
      )}
    </>
  );
}

function RegisterFormPanel({
  isLoading,
  onFinish,
}: {
  isLoading: boolean;
  onFinish: (values: RegisterValues) => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<RegisterValues>();

  return (
    <Form<RegisterValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      onFinish={onFinish}
      disabled={isLoading}
      validateTrigger={["onBlur", "onChange"]}
    >
      <Form.Item
        name="username"
        rules={[
          { required: true, message: t("login.error.empty") },
          { min: 2, message: t("login.error.username_short") },
        ]}
        className="mb-3.5"
      >
        <Input
          prefix={<UserOutlined className="text-cyan-400/80 mr-1" />}
          placeholder={t("login.username.placeholder")}
          allowClear
          autoFocus
          size="large"
          className="font-mono text-xs"
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          { required: true, message: t("login.error.empty") },
          { min: 6, message: t("login.error.weak_password") },
        ]}
        className="mb-3.5"
      >
        <Input.Password
          prefix={<LockOutlined className="text-cyan-400/80 mr-1" />}
          placeholder={t("login.password.placeholder")}
          size="large"
          className="font-mono text-xs"
        />
      </Form.Item>
      <Form.Item
        name="confirm"
        dependencies={["password"]}
        rules={[
          { required: true, message: t("login.confirm_mismatch") },
          ({ getFieldValue }) => ({
            validator(_, value) {
              const password = getFieldValue("password");
              return value === password || value === ""
                ? Promise.resolve()
                : Promise.reject(new Error(t("login.confirm_mismatch")));
            },
          }),
        ]}
        className="mb-6"
      >
        <Input.Password
          prefix={<LockOutlined className="text-cyan-400/80 mr-1" />}
          placeholder={t("login.confirm_password.placeholder")}
          size="large"
          className="font-mono text-xs"
        />
      </Form.Item>
      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          block
          size="large"
          className="font-mono text-xs tracking-wider h-11 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 border-0 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-300 active:scale-[0.98]"
        >
          {isLoading ? t("login.registering") : t("login.register")}
        </Button>
      </Form.Item>
    </Form>
  );
}
