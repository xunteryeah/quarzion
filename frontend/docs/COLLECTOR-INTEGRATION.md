# 真实采集器接入

## 1. 领取运行

```http
GET /api/collector/next?projectId=watch-intelligence
Authorization: Bearer <GEO_PROOF_INGEST_KEY>
```

成功时返回：

```json
{
  "id": "run-id",
  "projectId": "watch-intelligence",
  "promptId": "prompt-id",
  "platform": "ChatGPT",
  "queryText": "高级手表品牌有哪些值得推荐？",
  "intent": "品类探索",
  "attempt": 1
}
```

队列为空返回 `204`；并发领取冲突返回 `409`。领取成功后运行状态变为 `running`。

## 2. 回传成功回答

```http
POST /api/collector/ingest
Authorization: Bearer <GEO_PROOF_INGEST_KEY>
Content-Type: application/json

{
  "runId": "run-id",
  "status": "success",
  "durationMs": 12842,
  "rawText": "原始回答全文……",
  "citations": [
    {
      "url": "https://example.com/article",
      "title": "文章标题",
      "sourceType": "行业媒体"
    }
  ]
}
```

系统会：

1. 以主品牌、竞品、已批准别名解析品牌实体。
2. 按第一次出现顺序计算位置，并保留提及次数。
3. 识别回答附近的正负向语义，生成可替换的基线情绪分。
4. 保存原文、解析器版本、引用 URL、域名和审计事件。
5. 将运行置为 `parsed`，立即纳入报表口径。

若 `citations` 为空，系统会从原始文本中提取完整 HTTP(S) URL。

## 3. 回传异常

```json
{
  "runId": "run-id",
  "status": "timeout",
  "durationMs": 60000,
  "errorMessage": "平台在 60 秒内未返回完整回答"
}
```

允许状态为 `failed`、`timeout`、`blocked`。异常保留在运行中心，但不会进入有效回答分母。人工可以在界面里重试。

## 4. 生产采集器建议

- 优先使用平台官方 API 与企业授权账号；不要规避验证码或平台访问控制。
- 采集器应保存平台响应 ID、模型名、采集地区、语言与采集版本，便于追责。
- 调度器以固定问题集、固定平台、固定时间窗运行；只有这样前后对比才有意义。
- 采集失败使用指数退避；同一 `unique_run_key` 不重复入库。
- 当平台不返回引用时，不推断或伪造 URL。

## 5. 从监测到优化

监测系统不会直接“修改 ChatGPT / Gemini”。标准执行链是：

1. 从低提及问题、高覆盖低关联来源中发现缺口。
2. 创建优化任务，指定客户内容页、媒体资料、FAQ、百科或公关分发动作。
3. 客户在可控渠道发布，任务里保存发布 URL 和时间。
4. 固定问题集继续监测 7–28 天。
5. 用同平台、同问题、同口径的前后窗口生成效果证明。

这使乙方交付从“我们做了很多内容”变成“这项动作之后，哪些 AI 回答、引用和品牌位置发生了可复核变化”。
