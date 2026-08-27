# GEO Proof 系统架构

## 分层

### 产品层

- 多客户项目管理
- 提示词与品牌实体管理
- 监测、引用和竞品报表
- 优化任务与效果证明

### API 层

- Dashboard Read API：返回项目级聚合和证据明细。
- Workflow Command API：处理运行重试、实体复核和任务变更。
- 后续 Collector API：接收不同平台适配器写入的 Raw Run。

### 数据层

- D1/SQLite 保存项目、运行、回答、实体、引用、任务和证据快照。
- 原始回答首版保存在 D1；生产规模扩大后迁移到 R2，对象元数据继续保留在 D1。
- 所有运行、解析和指标均保存版本与时间字段。

## 关键原则

1. Raw Run 与 Answer 分离，允许历史重新解析。
2. 运行使用业务唯一键，重试不会产生重复样本。
3. 报表只统计解析成功且具有有效回答的运行。
4. 实体纠错不覆盖历史审计记录。
5. 效果证明不把简单的发布后上涨描述为确定因果。

## 平台适配器接口

每个平台适配器最终需要返回统一结构：

```ts
type CollectorResult = {
  platform: string;
  queryText: string;
  scheduledAt: string;
  completedAt: string;
  status: "success" | "failed" | "timeout" | "blocked";
  rawText: string | null;
  rawCitations: Array<{ url: string; title?: string; description?: string }>;
  collectorVersion: string;
  errorCode?: string;
  errorMessage?: string;
};
```

## 生产扩展路径

- 任务量增大：引入独立队列和 Worker。
- 原始数据增大：Raw Payload 迁移至 R2。
- 客户开放访问：增加身份、组织成员和项目权限。
- 多地区采样：在运行唯一键中加入地区、语言和采样序号。

