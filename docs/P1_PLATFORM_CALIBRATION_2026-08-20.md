# Quarzion P1 三平台匿名网页校准记录

校准时间：2026-08-20（Asia/Shanghai）  
采集器版本：`quarzion-collector/1.1.0`  
执行规则：无登录、低频、单浏览器顺序执行、不绕过验证码或平台限制。

## 结果

| 平台 | HTTP / 最终页面 | 采集结果 | 页面指纹 | 证据 |
|---|---|---|---|---|
| 豆包 | 跳转至 `https://www.doubao.com/security/doubao-region-ban?source=1` | `access_blocked`：当前出口地区不可用 | `7447c314d4ff811727da7c3041024fe6331a2254001c6fe78f3914c802cbf01b` | WebP 截图与 HTML 均成功生成 |
| 腾讯元宝 | `https://yuanbao.tencent.com/chat/naQivTmsDa`，输入框提示“请登录后输入内容” | `login_required`：匿名页面要求登录 | `5badc44fb85363e9202324d2cfd4987ec8182188a0fc49c22b1955d61a4e245c` | WebP 截图与 HTML 均成功生成 |
| DeepSeek | `https://chat.deepseek.com/` 返回 CloudFront HTTP 403 | `access_blocked`：匿名访问被拒绝 | `86c8dddbbbf0788d5856b1db26ca2d529a1448c6123e720fdff5240336ab37a6` | WebP 截图与 HTML 均成功生成 |

## 结论

三个平台的任务轮询、阻断识别和失败证据链已经可用，但当前匿名出口无法产生真实回答：豆包受地域限制，腾讯元宝需要登录，DeepSeek 拒绝当前匿名访问。采集器保持生产默认关闭；在合法出口或授权会话准备好之前，不把阻断页面伪装为真实回答，也不启动七天成功率观察。

P1-05 账号/会话池与 P1-06 多城市出口 IP 继续延期；因此它们不阻塞调度器、证据库、权限、后台和异常中心的开发，但会阻塞三平台“真实成功回答”的最终验收。
