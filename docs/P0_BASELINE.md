# Quarzion P0 上线前基线

基线时间：2026-08-20（Asia/Shanghai）  
线上快照：`/opt/quarzion/backups/20260819T205841Z-p0-baseline`  
恢复演练：已通过隔离卷恢复、SQLite 完整性检查、源码解包和 Nginx 配置检查。

## 已确认的线上基础设施

- `https://quarzion.com/`：官网，HTTP 200。
- `https://quarzion.com/dashboard`：当前客户后台，HTTP 200，尚未要求客户登录。
- `https://admin.quarzion.com/`：内部管理端，Nginx Basic Auth 保护。
- `www.quarzion.com`：301 跳转到主域名并保留路径。
- `furo.art`：301 跳转到 `quarzion.com` 并保留路径。
- `api.furo.art`：301 跳转到 `admin.quarzion.com`。
- 前台、管理端和 Nginx 容器均在运行；前台与管理端健康检查通过。
- HTTPS 证书覆盖 `quarzion.com`、`www.quarzion.com` 和 `admin.quarzion.com`。

## 当前数据库事实

### 客户后台数据库

- 独立 Docker 卷：`quarzion_frontend-data`。
- 文件：`quarzion.sqlite`。
- 12 张业务表，共 162 行。
- 主要数据量：2 个项目、9 个品牌、7 条提示词、21 次运行、17 条回答、30 条引用。
- 完整性检查：`ok`。

### 管理后台数据库

- 独立 Docker 卷：`quarzion_admin-data`。
- 文件：`quarzion-admin.sqlite`。
- 7 张业务表，共 34 行。
- 主要数据量：3 个组织、3 个项目、4 个账号池、9 个账号、7 个任务。
- 完整性检查：`ok`。

### 结构性风险

- 两个后台使用两套独立 SQLite 数据库，客户、项目和平台记录不会自动同步。
- 客户后台尚无用户、组织成员、邀请或会话表。
- 管理后台只有 Nginx Basic Auth 和独立管理数据，没有统一 SaaS 身份模型。
- 当前生产启动逻辑会在空数据库中自动写入演示数据。

## 演示数据与固定展示来源

### 客户后台

- `frontend/db/bootstrap.ts`
  - `seedDatabase()` 在空库启动时自动生成整套演示数据。
  - 固定客户：Digital Luxury Group、Northstar Mobility。
  - 固定项目：高端腕表 GEO、新能源汽车 GEO。
  - 固定平台：ChatGPT、Perplexity、Gemini。
  - 固定日期：2026-07-18 至 2026-08-01。
  - 固定采集版本：`demo-collector/1.0`。
  - 固定回答、引用、优化动作和效果快照均为演示内容。
- `frontend/components/Dashboard.tsx`
  - 将 ChatGPT、Perplexity、Gemini 映射成 DeepSeek、豆包、元宝展示。
  - 日期筛选器固定为 2026-07-30 至 2026-08-01。
  - 趋势折线和日期轴由当前汇总数值生成，并非真实时间序列。
  - 新建任务和提示词仍向接口提交旧平台名称。
- `frontend/app/api/dashboard/route.ts`
  - 平台统计和默认新提示词仍使用 ChatGPT、Perplexity、Gemini。

### 管理后台

- `admin/drizzle/0000_married_bucky.sql`
  - 迁移文件直接插入 3 个演示组织、3 个演示项目、4 个演示账号池、9 个演示账号和任务事件。
  - 账号凭据字段只是 `secret/...` 引用字符串，不代表真实凭据已经接入。
  - 所有成功率、运行时间、冷却、异常和审计记录均为固定演示值。

### 官网

- 官网产品界面图中的可见度、提及数、引用数和增长率是营销视觉示例，不是线上客户数据。
- P0 要求这些示例保持在官网营销层，并与真实客户后台数据明确隔离。

## 当前接口与安全事实

- 客户 Dashboard API 可以读写项目、提示词、优化任务和运行队列，但没有客户身份或组织权限校验。
- Collector API 已配置 Bearer Key，但尚无真实 Worker 连接。
- 管理 API 受 Nginx Basic Auth 和内部请求头保护。
- 尚无客户登录、退出、邀请、组织空间和跨组织隔离测试。
- 尚无联系表单提交 API。
- Nginx 有基础访问日志，但尚无结构化告警和应用级限流。

## P0 迁移边界

- 当前两个 SQLite 数据库和演示数据必须只读归档，不能直接当作正式客户库继续使用。
- 正式生产数据库必须从空结构开始，不执行演示 Seed。
- 演示环境继续保留，但使用独立数据库、域名或明确的 Demo 标记。
- P0 迁移后，管理端和客户端必须读取同一组织、项目和用户数据源。
