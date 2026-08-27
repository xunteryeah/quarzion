# Quarzion 三平台 API 监测架构

更新时间：2026-08-27

## 产品定义

Quarzion 是一个基于豆包、千问和 DeepSeek 官方 API 的多模型 GEO 监测、引用分析与效果证明平台。

本期只测量模型本身的回答，以及模型通过供应商原生 Web Search 得到的回答。AXP、网页自动化、账号池和多城市出口均不在本期架构内。

## 标准运行矩阵

每个项目默认配置 10 条提示词，每天执行一次：

| 平台 | 主旗舰 | 次旗舰 | 直接回答 | 原生联网 |
| --- | --- | --- | --- | --- |
| 豆包 | Seed 2.1 Pro | Seed 2.1 Turbo | 支持 | 支持 |
| 千问 | Qwen 3.8 Max | Qwen 3.7 Plus | 支持 | 支持 |
| DeepSeek | V4 Pro | V4 Flash | 支持 | Pro 暂不支持；Flash 支持 |

理论矩阵是 120 次/项目/天。能力过滤会拒绝 DeepSeek V4 Pro 的 10 次联网任务，所以当前实际为 110 次/项目/天。

不允许将不支持的联网任务改成直接回答，也不允许改用第三方搜索后仍标为“供应商原生联网”。

## 双服务器职责

### 新加坡控制面

- `quarzion.com`：官网和客户后台
- `admin.quarzion.com`：内部管理后台
- 统一业务 API、鉴权、组织/项目隔离
- SQLite 主数据库、证据索引、调度器、报告与备份
- 不保存模型供应商的长期 API Key

### 上海执行面

- 豆包、千问、DeepSeek 官方 API Worker
- DeepSeek V4 Flash 分析 Worker
- 从新加坡领取短期租约任务，返回签名结果
- 不对公网提供客户页面，不直接挂载或访问 SQLite 文件
- 模型 API Key 只保存在本机受限环境变量中

### 网络

- 两台服务器通过 WireGuard 私网通信
- Worker 仅能访问任务 API、三家模型 API 和必要的时间/DNS 服务
- 新加坡只接受已登记 Worker 的签名请求
- 每次领取带租约令牌，回传必须包含任务、Worker、租约和幂等键

## 数据流

1. 调度器按项目、提示词、平台、模型和回答模式生成唯一运行任务。
2. 能力注册表在入队前拒绝不支持的组合。
3. 上海 Worker 领取任务并调用对应供应商官方 API。
4. Worker 解析完整回答、原始 JSON、引用、搜索调用、Token、请求 ID 和时延。
5. 新加坡验证租约、大小、哈希和幂等键后写入数据库。
6. 规则解析器计算品牌、竞品、排名、共现和引用指标。
7. DeepSeek V4 Flash 只对已经计算好的结构化数据生成说明与建议。
8. 客户端和报告中的每个指标都能回溯到原始回答与引用证据。

## 关键数据对象

- `provider_models`：平台、模型、档位、直答/联网能力、启用状态
- `monitoring_schedules`：项目频率、时区、提示词上限、启用状态
- `runs`：平台、模型、模式、状态、请求 ID、Token、费用、时延、哈希
- `answers`：回答原文、解析版本、品牌位置与规则分数
- `citations`：URL、域名、标题、片段、顺序和供应商来源 ID
- `run_attempts`：每次尝试、失败分类、Worker 和版本
- `evidence_artifacts`：原始响应与可选附件的哈希证据
- `analysis_reports`：结构化指标输入、模型说明输出和提示词版本

## 指标责任边界

以下指标必须由确定性代码计算：提及率、Top 1/Top 3、平均排名、SOR、竞品共现、引用覆盖率、唯一 URL、唯一域名、成功率、Token、时延和费用。

分析模型只能解释这些字段，不能自行填写缺失数字、改变样本量或给出无法回溯的结论。

## 官方接口依据

- [火山方舟 Responses API 与工具调用](https://www.volcengine.com/docs/82379/1958524?lang=zh)
- [阿里云百炼联网搜索](https://help.aliyun.com/zh/model-studio/web-search/)
- [DeepSeek Responses API](https://api-docs.deepseek.com/guides/responses_api/)

能力表以真实冒烟测试结果为最终依据。文档变化或模型升级不会自动改变生产能力；必须经过测试、审核和版本记录后启用。

