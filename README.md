# Lune

私人书签导航管理器。从 PHP + SQLite3 重构为 Next.js + TypeScript + Prisma + Tailwind CSS + shadcn/ui。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 数据库 | SQLite (via better-sqlite3) |
| ORM | Prisma 5 |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 图标 | lucide-react |
| 认证 | Cookie-based (bcrypt) |

## 项目结构

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 公开首页（RSC）
│   ├── login/page.tsx          # 登录页
│   ├── admin/                  # 后台管理
│   │   ├── layout.tsx
│   │   ├── page.tsx            # 仪表盘
│   │   ├── categories/page.tsx # 分类 CRUD
│   │   ├── links/page.tsx      # 链接 CRUD
│   │   ├── import/page.tsx     # 书签导入
│   │   └── settings/site/page.tsx
│   ├── api/                    # API 路由
│   │   ├── auth/               # 登录/登出
│   │   ├── categories/         # 分类 CRUD
│   │   ├── links/              # 链接 CRUD
│   │   ├── info/               # 站点统计
│   │   └── settings/site/      # 站点配置
│   └── click/[id]/             # 链接点击重定向
├── components/
│   ├── public/                 # 前台组件
│   ├── admin/                  # 后台组件
│   ├── shared/                 # 共享组件
│   └── ui/                     # shadcn/ui 组件
├── lib/                        # 工具库
│   ├── prisma.ts               # Prisma 客户端单例
│   ├── auth.ts                 # 认证工具
│   ├── icons.ts                # 图标映射
│   └── utils.ts                # 通用工具
├── types/                      # TypeScript 类型
└── proxy.ts                    # 认证中间件（Next.js 16 proxy）
prisma/
├── schema.prisma               # 数据模型
└── onenav.db                   # SQLite 数据库文件
scripts/
└── migrate.ts                  # 数据迁移脚本
```

## 数据库模型

三张核心表：

- **on_categorys** — 分类（id, name, fid/parent_id, weight, property, font_icon）
- **on_links** — 书签链接（id, fid/category_id, title, url, description, weight, property）
- **on_options** — 键值配置（key, value）

## 快速开始

### 安装

```bash
npm install
```

### 配置认证密钥

`AUTH_SECRET` 是登录 Session 签名所必需的环境变量，必须是至少 32 个随机字节。复制 `.env.example` 为 `.env`，然后使用以下跨平台命令生成密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

将输出写入 `.env` 的 `AUTH_SECRET`，不要提交真实密钥。缺失、空白或不足 32 UTF-8 字节时，登录和 Session 验证会 fail closed。轮换 `AUTH_SECRET` 会立即使全部现有 Session 失效，所有用户需要重新登录。

### 数据迁移（从旧 PHP 项目）

```bash
# 确保 Old Reference Project 目录存在于项目根目录
npx tsx scripts/migrate.ts
```

### 初始化数据库（无旧数据）

```bash
npx prisma db push
```

### 日常使用（推荐）

```bash
npm run build -- --webpack && npm start
```

生产模式下所有页面预编译，响应时间 **1-30ms**，等同原 PHP 项目体验。

### 开发模式

```bash
npm run dev -- --webpack
```

开发模式支持热更新（HMR）。首次访问每个页面有编译延迟（正常现象），后续访问即时响应。

> **注意**: 当前 Windows 环境下 Turbopack 与 Prisma 存在 symlink 兼容问题，需使用 `--webpack`。`--turbo` 暂不可用。

## 路由总览

| 路由 | 类型 | 说明 |
|------|------|------|
| `/` | SSR | 公开首页，展示分类和链接卡片 |
| `/login` | Client | 登录页 |
| `/admin` | Client | 后台仪表盘（需登录） |
| `/admin/categories` | Client | 分类管理 |
| `/admin/links` | Client | 链接管理 |
| `/admin/import` | Client | 书签导入 |
| `/admin/settings/site` | Client | 站点设置 |
| `/click/[id]` | SSR | 链接点击跳转 |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/logout` | POST | 登出 |
| `/api/categories` | GET/POST | 分类列表/创建 |
| `/api/categories/[id]` | GET/PUT/DELETE | 单个分类 CRUD |
| `/api/links` | GET/POST | 链接列表/创建 |
| `/api/links/[id]` | GET/PUT/DELETE | 单个链接 CRUD |
| `/api/info` | GET | 站点统计 |
| `/api/settings/site` | GET/PUT | 站点设置 |

所有 `/api/*` 端点和 `/admin/*` 路由受代理认证保护。公开端点白名单：`/api/info`、`/api/auth/login`、`/api/auth/logout`。

## 认证

Cookie-based 认证。登录时服务端生成 session token，设置 httpOnly Cookie（30 天有效期）。

密码存储：首次登录自动将旧 MD5 哈希升级为 bcrypt。
