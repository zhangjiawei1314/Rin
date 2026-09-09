# Rin 项目指南

> Rin - 现代化博客平台，基于 Cloudflare Workers 和 React 构建

## 项目概览

Rin 是一个基于 Bun 工作区的产品型 Monorepo，包含 React 前端、Cloudflare Workers 后端、共享类型包和 CLI 工具。

- **版本**: 0.3.0
- **包管理器**: Bun 1.3.13
- **构建工具**: Turbo
- **前端**: React 18 + Vite + Wouter
- **后端**: Cloudflare Workers + Hono + Drizzle ORM
- **数据库**: Cloudflare D1 (SQLite)

## 目录结构

```
rin/
├── client/                  # React 前端应用
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── page/           # 页面组件
│   │   ├── api/            # API 客户端
│   │   ├── app/            # 应用配置和路由
│   │   ├── hooks/          # 自定义 Hooks
│   │   └── utils/          # 工具函数
│   ├── public/             # 静态资源
│   └── package.json
├── server/                 # Cloudflare Workers 后端
│   ├── src/
│   │   ├── services/       # API 路由处理器
│   │   ├── db/             # 数据库 Schema
│   │   ├── core/           # 路由、中间件、类型
│   │   ├── utils/          # 工具函数
│   │   └── _worker.ts      # Worker 入口
│   └── package.json
├── packages/               # 共享包
│   ├── api/                # 共享 API 类型和 Schema 验证器
│   ├── config/             # 共享配置
│   └── ui/                 # 共享 UI 组件（未完成）
├── cli/                    # Rin CLI 工具
│   ├── bin/
│   │   └── rin.ts          # CLI 入口
│   └── src/
│       ├── commands/       # 命令实现
│       ├── tasks/          # 任务实现
│       └── lib/            # CLI 库
├── docs/                   # 文档
├── scripts/                # 构建脚本
├── package.json            # 根 package.json（工作区配置）
├── turbo.json              # Turbo 配置
└── wrangler.toml           # Cloudflare Workers 配置
```

## 构建方式

### 开发环境

```bash
# 启动完整开发环境（前端 + 后端）
bun dev

# 仅启动前端
bun dev:client

# 仅启动后端
bun dev:server

# 启动后端并启用 Cron 触发器测试
bun dev:cron
```

### 构建

```bash
# 构建所有工作区
bun run build:all

# 构建前端
bun run build:client

# 构建后端（部署到 dist/server）
bun run build:server
```

### 部署

```bash
# 部署前端（Pages）和后端（Workers）
bun run deploy

# 仅部署后端
bun run deploy:server

# 仅部署前端
bun run deploy:client
```

### 测试

```bash
# 运行所有测试
bun run test

# 前端测试
bun run test:client
bun run test:client:watch
bun run test:client:coverage

# 后端测试
bun run test:server
bun run test:server:watch
bun run test:server:coverage

# 覆盖率报告
bun run test:coverage
```

### 代码质量

```bash
# TypeScript 类型检查
bun run check

# 格式检查
bun run format:check

# 自动格式化
bun run format:write
```

### 数据库

```bash
# 生成 Drizzle 迁移
bun run db:generate

# 运行数据库迁移
bun run db:migrate

# 修复 top 字段问题
bun run db:fix
```

## 技术栈

### 前端技术栈

- **框架**: React 18
- **构建工具**: Vite 6.0.0
- **路由**: Wouter 3.1.3
- **样式**: TailwindCSS 3.4.3
- **Markdown**: react-markdown, remark-gfm, rehype-*
- **代码高亮**: react-syntax-highlighter
- **图表**: mermaid
- **国际化**: i18next, react-i18next
- **状态管理**: React Context
- **测试**: bun:test, @testing-library/react

### 后端技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono 4.12.2
- **ORM**: Drizzle ORM 0.30.10
- **数据库**: Cloudflare D1 (SQLite)
- **认证**: Arctic 3.7.0 (OAuth), jose 5.3.0 (JWT)
- **RSS**: feed 4.2.2
- **XML**: fast-xml-parser 4.3.0
- **Markdown**: remark-* 系列

### 共享包

- **@rin/api**: API 类型定义、Schema 验证器
- **@rin/config**: 配置类型和默认值
- **@rin/ui**: UI 组件（开发中）

## 路由系统

### 前端路由 (Wouter)

前端路由定义在 `client/src/app/routes.tsx`:

```typescript
// 主页
/

// 时间线
/timeline

// 动态
/moments

// 友情链接
/friends

// 标签
/hashtags
/hashtag/:name

// 搜索
/search/:keyword

// 管理（需要权限）
/admin/settings
/admin/health
/admin/queue-status
/admin/compat-tasks
/admin/writing
/admin/writing/:id

// 用户
/callback
/login
/profile
/user/github

// 文章详情
/feed/:id
/:alias
```

### 后端路由 (Hono)

后端路由通过 `registerRoutes()` 函数注册（`server/src/core/register-routes.ts`）:

- `GET /` - 健康检查
- `Route /feed` - FeedService（文章 CRUD）
- `Route /search` - SearchService（搜索）
- `Route /wp` - WordPressService（WordPress 导入）
- `Route /tag` - TagService（标签管理）
- `Route /comment` - CommentService（评论）
- `Route /storage` - StorageService（存储上传）
- `Route /blob` - BlobService（Blob 操作）
- `Route /friend` - FriendService（友情链接）
- `Route /moments` - MomentsService（动态）
- `Route /user` - UserService（用户管理）
- `Route /auth` - PasswordAuthService（认证）
- `Route /config` - ConfigService（配置管理）
- `Route /` - RSSService（RSS 订阅）
- `Route /` - SitemapService（站点地图）
- `Route /favicon` - FaviconService（Favicon）

## 数据库 Schema

使用 Drizzle ORM 定义在 `server/src/db/schema.ts`:

### 核心表

- **feeds** - 文章表
  - id, alias, title, summary, ai_summary, content
  - listed, draft, top
  - uid (外键到 users)
  - 索引: alias, visibility_order, uid

- **moments** - 动态表
  - id, content, uid
  - createdAt, updatedAt

- **comments** - 评论表
  - id, feedId, userId, content
  - createdAt, updatedAt

- **users** - 用户表
  - id, username, openid, avatar, password, permission
  - 索引: openid

- **friends** - 友情链接表
  - id, name, desc, avatar, url, accepted, health, sort_order
  - uid (外键到 users)
  - 索引: accepted_order

### 统计表

- **visits** - 访问记录
  - id, feedId, ip, createdAt
  - 索引: feed_created_at

- **visit_stats** - 访问统计
  - feedId (主键), pv, hllData, updatedAt

### 配置表

- **info** - 键值配置
  - key (唯一), value

## 添加新依赖

### 为特定包添加依赖

```bash
# 为前端添加依赖
cd client
bun add <package-name>

# 为后端添加依赖
cd server
bun add <package-name>

# 为共享包添加依赖
cd packages/api
bun add <package-name>
```

### 为根项目添加开发依赖

```bash
bun add -d <package-name>
```

### 添加 Workspace 依赖

```bash
# 在 client 中引用 @rin/api
cd client
bun add @rin/api@workspace:*
```

## 添加新页面

### 1. 创建页面组件

在 `client/src/page/` 下创建新的页面组件:

```typescript
// client/src/page/new-page.tsx
import { useTranslation } from "react-i18next";

export function NewPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">{t("new_page.title")}</h1>
      <p>{t("new_page.description")}</p>
    </div>
  );
}
```

### 2. 添加路由

在 `client/src/app/routes.tsx` 中添加路由:

```typescript
import { NewPage } from "../page/new-page";

export function AppRoutes() {
  return (
    <Switch>
      {/* 其他路由 */}
      <AppRoute path="/new-page">
        <NewPage />
      </AppRoute>
    </Switch>
  );
}
```

### 3. 添加国际化

在 `client/src/locales/` 中添加翻译:

```json
{
  "new_page": {
    "title": "新页面",
    "description": "这是一个新页面"
  }
}
```

### 4. （可选）添加 API 路由

在 `server/src/services/` 中创建新的服务:

```typescript
// server/src/services/new-service.ts
import { Hono } from "hono";

export function NewService() {
  const app = new Hono();

  app.get("/", async (c) => {
    return c.json({ message: "Hello from new service" });
  });

  return app;
}
```

在 `server/src/core/register-routes.ts` 中注册:

```typescript
import { NewService } from "../services/new-service";

export function registerRoutes(app: RinApp) {
  // 其他路由
  app.route("/new-endpoint", NewService());
}
```

### 5. （可选）添加客户端 API

在 `client/src/api/client.ts` 中添加 API 方法:

```typescript
class NewAPI {
  constructor(private http: HttpClient) {}

  async getData(): Promise ApiResponse<DataType>> {
    return this.http.get<DataType>("/api/new-endpoint");
  }
}

export class ApiClient {
  // 其他 API
  new: NewAPI;

  constructor(baseUrl: string) {
    // 其他初始化
    this.new = new NewAPI(this.http);
  }
}
```

## 配置文件

### 环境变量

创建 `.env.local` 文件（已在 .gitignore 中）:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# JWT Secret
JWT_SECRET=your_jwt_secret

# AI 配置
AI_PROVIDER=openai
AI_MODEL=gpt-4
AI_API_KEY=your_api_key

# 存储
R2_BUCKET=your_bucket_name
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
```

### Wrangler 配置

`wrangler.toml` 文件配置 Cloudflare Workers:

```toml
name = "rin-server"
main = "server/src/_worker.ts"
compatibility_date = "2023-12-20"

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "rin-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "R2"
bucket_name = "your-bucket-name"
```

## 开发工作流

### 1. 开始新功能开发

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 启动开发服务器
bun dev
```

### 2. 修改代码

- 前端：修改 `client/src/` 下的文件
- 后端：修改 `server/src/` 下的文件
- 共享类型：修改 `packages/api/src/` 下的文件

### 3. 测试

```bash
# 运行测试
bun run test

# 类型检查
bun run check
```

### 4. 提交代码

```bash
# 格式化代码
bun run format:write

# 提交（遵循 conventional commits）
git commit -m "feat: add new feature"
```

### 5. 发布

```bash
# 创建新版本
bun run release patch  # 或 minor/major
```

## 中间件

后端中间件定义在 `server/src/core/register-middlewares.ts`:

- **CORS**: 允许跨域请求
- **Timing**: 请求计时
- **Init Container**: 初始化容器（数据库、缓存）
- **Auth**: 认证中间件

## 缓存策略

使用自定义 CacheImpl 实现缓存：

- Feed 列表缓存
- 搜索结果缓存
- 配置缓存

## Cron 任务

支持 Cloudflare Workers Cron 触发器：

```bash
# 测试 Cron 触发器
bun dev:cron
```

## 依赖关系图

```
client
  ├── @rin/api (workspace:*)
  ├── @rin/config (workspace:*)
  └── @rin/ui (workspace:*)

server
  ├── @rin/api (workspace:*)
  └── @rin/config (workspace:*)

@rin/config
  └── @rin/api (workspace:*)
```

## 常见问题

### 1. 数据库迁移失败

```bash
# 重新生成迁移
bun run db:generate

# 手动运行迁移
bun run db:migrate
```

### 2. 构建失败

```bash
# 清理构建产物
bun run clean

# 重新安装依赖
rm -rf node_modules
bun install
```

### 3. 本地开发 CORS 问题

确保 `wrangler.toml` 中的 `allowed_origins` 包含开发服务器地址。

## 贡献指南

1. 遵循 AGENTS.md 中的规则
2. 使用 conventional commits 格式提交
3. 运行测试和类型检查
4. 添加适当的注释和文档

## 许可证

LICENSE

---

*文档生成时间: 2026-09-09*
*项目版本: 0.3.0*
