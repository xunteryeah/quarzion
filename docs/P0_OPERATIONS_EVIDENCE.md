# Quarzion P0 生产运维证据

验证时间：2026-08-20（Asia/Shanghai）  
生产服务器：`47.236.194.150`

## 已激活

- `quarzion-backup.timer`：已启用且运行中，每日约 03:20（Asia/Shanghai）触发，带随机延迟。
- `quarzion-health.timer`：已启用且运行中，每 5 分钟检查官网、管理端、容器、磁盘和证书。
- 备份保留：本地生产备份保留 14 天；清理范围限定为 `/opt/quarzion/backups/*-p0-production`。
- Nginx 日志轮转配置已安装，正式切换结构化日志后按日压缩并保留 14 份。
- 当前生产 Nginx 已提前启用结构化 JSON 访问日志，并写入 `/opt/quarzion/logs/nginx/access.log`。
- 登录、联系表单、普通客户请求和管理员请求使用独立限流区。
- Mac 已安装 `com.quarzion.offsite-backup`，每天 04:20 拉取服务器生产备份并在本机加密保存。
- 正式发布指针：`/opt/quarzion/current` → `/opt/quarzion/releases/20260820-p0-09`。
- 正式容器：`quarzion-frontend:p0-20260820-09`、`quarzion-admin:p0-20260820-09`，共同使用 `quarzion_unified-data:/data`。
- 管理员密码哈希文件已收紧为 `640 root:101`，秘密目录为 `750 root:101`；Nginx 工作进程可读，其他本地用户不可读，发布门禁会持续检查。

## 首次生产备份与恢复验证

- 备份目录：`/opt/quarzion/backups/20260819T221550Z-p0-production`
- 当前旧版前台数据库：SQLite 在线一致性备份成功。
- 当前旧版管理数据库：SQLite 在线一致性备份成功。
- Compose、Nginx、环境配置、管理员密码文件、应用源码、镜像与容器元数据已纳入同一快照。
- SHA-256 清单校验通过。
- 两个数据库均在隔离读取环境执行完整性检查并返回 `ok`。
- 备份中的 Nginx 配置语法检查通过。
- 恢复验证没有替换或写入线上数据库卷。
- 首份生产备份已同步为 Mac 上的加密异地副本；完成了解密、SHA-256 清单与 SQLite 完整性验证。
- 服务器 `/opt/quarzion/.offsite-backup-ack` 已记录成功复制时间，发布闸门要求回执不超过 48 小时。

## 回退保护

- 安装正式运维脚本前，原服务器脚本已保存到 `/opt/quarzion/backups/20260819T221540Z-before-p0-ops`。
- P0 正式发布仍会另外生成切换前快照；发布失败时恢复旧 Compose、Nginx、环境配置、旧镜像和旧数据库卷。
- 应用生产日志与限流前的 Compose/Nginx 快照位于 `/opt/quarzion/backups/20260819T221820Z-before-precutover-nginx`。
- 2026-08-20 首次正式切换的最终路由验收发现异常后，自动使用 `/opt/quarzion/backups/20260820T034022Z-before-p0-deploy` 回滚；旧官网、旧容器和旧数据卷恢复成功。这证明失败自动回滚路径实际生效，而非仅有脚本。

## 生产日志与限流验收

- 官网返回 `200`、管理员后台无凭据返回 `401`、旧域名返回 `301`，原有路由保持不变。
- 新产生的验收访问日志全部为可解析的单行 JSON，没有混入默认 combined 格式。
- 访问 `/invite/secret-probe-token` 后日志只记录 `/invite/[REDACTED]`，不包含原始 Token。
- 连续请求登录接口时命中独立限流并返回 `429`。
- 官网响应包含 HSTS、`X-Request-ID`、`X-Content-Type-Options`、Referrer Policy 和 Permissions Policy。
- logrotate 解析通过：按日轮转、压缩、保留 14 份。

## 统一数据库与生产权限验收

- 正式迁移记录为 `0001_unified`、`0002_email_outbox`。
- 临时创建 A/B 两家客户并接受 A 的一次性邀请；A 读取 B 项目时仍只返回 A 项目，修改 B 项目返回 `404`。
- 撤销邀请后旧链接返回 `410`；重新生成邀请后旧链接返回 `410`、新链接返回 `200`。
- 客户退出后旧会话返回 `401`；无密钥的采集领取和回传接口均返回 `401`。
- 邀请 Token 只保存摘要，密码使用 600,000 轮 PBKDF2-SHA256，邮件载荷以 AES-256-GCM 加密保存。
- 咨询线索在 `queue_only` 下进入管理端并保持 `pending`；管理员状态更新写入审计记录。
- 验收数据已精确清理。清理后 `organizations`、`projects`、`users`、`organization_members`、`invitations`、`sessions`、`runs`、`answers`、`contact_submissions`、`email_outbox` 均为 `0`。

## 最新正式备份

- 备份目录：`/opt/quarzion/backups/20260820T035404Z-p0-production`。
- SHA-256 清单、Nginx 配置语法、源码归档和统一 SQLite 数据库均通过验证。
- 数据库复制到新临时卷后，SQLite 完整性返回 `ok`；恢复演练未替换线上数据库。
- 发布切换前快照：`/opt/quarzion/backups/20260820T035017Z-before-p0-deploy`。
- 最新备份已同步为 Mac 加密文件 `20260820T035404Z-p0-production.tar.enc`，完成解密、SHA-256 清单与 SQLite 完整性复验；服务器回执更新为该版本。
- Mac 自动任务已调整为每次优先同步服务器最新完整备份；只有显式设置回填模式时才补齐历史缺口。

## 尚待外部配置

- Resend 发信域名、生产 API Key 与实际收件邮箱尚未配置。
- 异常告警已支持复用 Resend 发送到运营邮箱；当前仅保留本地告警日志，外部邮件告警随 Resend 一并延期。群机器人 Webhook 为可选第二通道。
