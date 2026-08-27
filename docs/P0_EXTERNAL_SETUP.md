# Quarzion P0 外部配置清单

这份清单只包含无法由应用代码自行生成的外部配置。不要把 API Key、Webhook 或邮箱密码发到聊天、截图或代码仓库。DNS、HTTPS 和加密异地备份已经完成。2026-08-20 决定先以 `queue_only` 模式正式切换，邮件真实投递稍后启用。

## 1. Spaceship DNS（已完成）

在 `quarzion.com` 的高级 DNS 中新增两条记录：

| 主机 | 类型 | 值 | TTL |
| --- | --- | --- | --- |
| `app` | `A` | `47.236.194.150` | `30 分钟` |
| `api` | `A` | `47.236.194.150` | `30 分钟` |

现有的 `@`、`www` 和 `admin` 均已保留。`app` 与 `api` 已在 Cloudflare、Google、阿里公共 DNS 和生产服务器侧验证，五域名 HTTPS 证书也已签发并启用自动续期。

## 2. 邮件投递

在 Resend 中验证 `quarzion.com` 发件域名，并按 Resend 页面提供的值添加 DKIM/SPF DNS 记录。验证通过后，在服务器 `/opt/quarzion/.env` 中配置：

```dotenv
QUARZION_FROM_EMAIL=Quarzion <notifications@quarzion.com>
QUARZION_CONTACT_EMAIL=实际接收官网咨询的公司邮箱
RESEND_API_KEY=仅允许发送邮件的生产 API Key
```

切换到 `resend` 模式前会自动向 `QUARZION_CONTACT_EMAIL` 发送一封“正式环境邮件投递验证”。验证不通过不会启用真实投递。

暂缓邮件期间，服务器必须明确设置：

```dotenv
QUARZION_EMAIL_MODE=queue_only
```

此模式只允许咨询与邀请进入加密队列和内部“咨询线索”CRM，不会标记为已送达，也不会消耗重试次数。管理员可复制一次性邀请链接手动发送。配置 Resend 后改为 `QUARZION_EMAIL_MODE=resend`，真实验证成功后再启用邮件计时器投递。

## 3. 异常告警

生产异常默认复用 Resend，发送到 `QUARZION_ALERT_EMAIL`；未单独设置时自动使用 `QUARZION_CONTACT_EMAIL`。因此不再要求额外购买或配置告警服务。

如后续希望同时推送到企业群，可选配置一个可接收 JSON `POST` 的群机器人地址：

```dotenv
QUARZION_ALERT_WEBHOOK_URL=群机器人 Webhook
```

消息格式包含 `text`、`source` 和 `time`。`resend` 模式发布前会真实验证至少一个外部通道；当前 `queue_only` 模式下，备份、健康检查和邮件队列任务失败会写入受保护的本地告警日志，外部发送明确延期。

## 4. 加密异地备份（已完成）

Mac 已安装 `com.quarzion.offsite-backup` 自动任务，每天 04:20 从生产服务器拉取备份。传输使用 SSH，落盘使用 AES-256-CBC + PBKDF2 加密，密钥仅保存在 Mac：

```text
~/Library/Application Support/Quarzion/offsite-backups
```

首次加密副本已完成解密、SHA-256 清单和 SQLite 完整性验证。成功拉取后，Mac 会在服务器写入受限回执；发布闸门要求回执不超过 48 小时。

## 5. 发布

`queue_only` 或完整邮件配置必须二选一且明确写入环境。服务器的自动前置检查返回 `ready: true` 后，由发布脚本完成备份、切换、健康验证和失败回滚，不需要手工替换线上容器。当前正式版本为 `20260820-p0-09`，已处于 `queue_only`。
