export type ContentSection = {
  eyebrow?: string;
  title: string;
  body: string;
  bullets?: string[];
  stat?: { value: string; label: string };
};

export type MarketingPageKind =
  | "product"
  | "solution"
  | "pricing"
  | "index"
  | "guide"
  | "howto"
  | "faq"
  | "lab"
  | "case"
  | "article"
  | "tool"
  | "company";

export type MarketingPage = {
  path: string;
  kind: MarketingPageKind;
  kicker: string;
  title: string;
  emphasis?: string;
  summary: string;
  theme?: "cream" | "brown" | "mist" | "lime";
  audience?: string;
  readTime?: string;
  updated?: string;
  highlights?: Array<{ value: string; label: string }>;
  sections: ContentSection[];
  related?: string[];
};

const productPages: MarketingPage[] = [
  {
    path: "platform/ai-visibility",
    kind: "product",
    kicker: "AI 搜索可见度",
    title: "成为 AI 答案里的",
    emphasis: "被推荐品牌。",
    summary:
      "通过官方 API 持续采集豆包、千问和 DeepSeek 的直接回答与联网回答，追踪品牌提及、位置、引用与竞争声音份额。",
    theme: "mist",
    highlights: [
      { value: "3", label: "已接入官方平台" },
      { value: "11", label: "有效模型与模式组合" },
      { value: "提示词级", label: "原始回答证据" },
    ],
    sections: [
      {
        eyebrow: "回答份额",
        title: "知道品牌到底出现在哪里",
        body: "按主题、意图、客户画像和平台查看品牌进入答案的频率，并与核心竞争对手在同一组提示词下进行可比分析。",
        bullets: [
          "品牌提及率与声音份额",
          "首次出现位置与前三提及率",
          "品牌正向、混合与负向语境",
          "品牌词和非品牌词分开统计",
        ],
      },
      {
        eyebrow: "趋势",
        title: "把偶然波动与真实增长分开",
        body: "使用固定提示词、固定平台与固定运行窗口形成可重复的时间序列，判断一次内容优化是否真的带来持续变化。",
        bullets: [
          "自定义时间窗口",
          "优化事件标记",
          "平台与主题分层",
          "异常变化自动提示",
        ],
      },
      {
        eyebrow: "回答详情",
        title: "每一个指标都能回到原始答案",
        body: "不是只展示一个黑盒分数。点击任意指标可以查看运行时间、平台、模型、直接/联网模式、完整回答、品牌实体、引用来源和解析版本。",
      },
      {
        eyebrow: "竞争情报",
        title: "发现竞争品牌正在赢得什么",
        body: "识别竞争品牌被优先推荐的问题、常见描述方式和高影响引用来源，把结果转化为内容与公关行动。",
      },
    ],
    related: [
      "platform/citations",
      "platform/insights",
      "how-tos/track-brand-presence",
    ],
  },
  {
    path: "platform/citations",
    kind: "product",
    kicker: "引用情报",
    title: "看清哪些来源正在塑造",
    emphasis: "AI 的答案。",
    summary:
      "从每条回答中提取引用 URL、域名、页面类型与品牌关联，识别值得争取、修复和长期建设的来源。",
    theme: "brown",
    highlights: [
      { value: "URL 级", label: "引用溯源" },
      { value: "来源影响", label: "跨提示词聚合" },
      { value: "自有/第三方", label: "内容类型拆分" },
    ],
    sections: [
      {
        eyebrow: "高频来源",
        title: "找到真正影响品类认知的网站",
        body: "按域名和具体页面统计引用次数、覆盖提示词、关联品牌和首次出现时间，判断权威性集中在哪里。",
        bullets: [
          "高频域名与页面",
          "来源影响指数",
          "竞争品牌关联率",
          "新增与流失引用",
        ],
      },
      {
        eyebrow: "内容类型",
        title: "判断应该改官网还是做第三方建设",
        body: "把引用分为品牌官网、媒体报道、行业榜单、社区讨论、百科、研究报告与电商内容，确定下一步动作。",
      },
      {
        eyebrow: "引用缺口",
        title: "发现应该被引用却没有被引用的页面",
        body: "把页面主题与提示词意图对齐，标记内容相关但尚未进入答案的页面，并给出结构、事实与可信度方面的改进建议。",
      },
      {
        eyebrow: "获取计划",
        title: "从数据直接创建引用建设任务",
        body: "把目标域名、目标提示词、负责人、发布页面和验证窗口写入任务，后续自动比较前后引用表现。",
      },
    ],
    related: [
      "platform/ai-visibility",
      "platform/site-audit",
      "how-tos/track-citations",
    ],
  },
  {
    path: "platform/insights",
    kind: "product",
    kicker: "行动洞察",
    title: "把监测数据变成",
    emphasis: "下一步行动。",
    summary:
      "自动识别竞争盲区、内容缺口、异常波动、引用机会和快速收益，让团队不用在报表里寻找答案。",
    theme: "lime",
    highlights: [
      { value: "优先级", label: "按影响与难度排序" },
      { value: "Action", label: "一键创建任务" },
      { value: "Evidence", label: "行动前后证明" },
    ],
    sections: [
      {
        eyebrow: "机会发现",
        title: "找到最值得先做的提示词和主题",
        body: "综合业务价值、竞争差距、引用可得性和当前表现，为每个机会计算优先级。",
        bullets: [
          "竞争品牌领先但差距可追",
          "已有排名但缺少品牌提及",
          "已有提及但缺少自有引用",
          "需求上升但内容覆盖不足",
        ],
      },
      {
        eyebrow: "内容建议",
        title: "明确修改什么，而不是只说需要优化",
        body: "建议会落到具体页面、事实模块、标题结构、FAQ、产品定义、比较内容和第三方来源建设。",
      },
      {
        eyebrow: "协同",
        title: "连接内容、公关、SEO 和产品团队",
        body: "每条洞察可以转为任务，配置负责人、目标平台、目标提示词、截止日期和验证标准。",
      },
      {
        eyebrow: "闭环",
        title: "行动完成后自动进入观察窗口",
        body: "系统保留行动前基线，在发布后按固定频率采集，并生成可审计的前后对比。",
      },
    ],
    related: [
      "platform/ai-visibility",
      "platform/citations",
      "platform/site-audit",
    ],
  },
  {
    path: "platform/agent-traffic",
    kind: "product",
    kicker: "AI Agent 流量",
    title: "分析网站的新访客：",
    emphasis: "AI 智能体。",
    summary:
      "识别 AI 爬虫、检索智能体与训练机器人访问了哪些页面、发生在什么时间，以及这些访问是否与真实用户问题有关。",
    theme: "mist",
    highlights: [
      { value: "检索", label: "真实问题触发" },
      { value: "索引", label: "内容发现与更新" },
      { value: "训练", label: "数据采集型流量" },
    ],
    sections: [
      {
        eyebrow: "模型分布",
        title: "知道哪些 AI 平台真的在访问",
        body: "按豆包、千问、DeepSeek、Kimi 等平台的公开或可识别 User-Agent 汇总访问趋势。",
      },
      {
        eyebrow: "信号与噪音",
        title: "区分检索、索引和训练流量",
        body: "不是所有机器人访问都代表用户需求。系统按访问模式和请求特征分类，优先关注由真实问题触发的检索访问。",
      },
      {
        eyebrow: "热门页面",
        title: "发现 AI 最依赖的内容",
        body: "查看被智能体访问最多的页面、访问频率、来源平台和后续被引用情况。",
      },
      {
        eyebrow: "部署",
        title: "连接 CDN、服务器日志或采集端",
        body: "支持通过 Cloudflare、Nginx、日志上传和 API 接入现有基础设施，不影响正常用户访问。",
      },
    ],
    related: [
      "platform/content-delivery",
      "platform/site-audit",
      "how-tos/track-ai-bot-traffic",
    ],
  },
  {
    path: "platform/site-audit",
    kind: "product",
    kicker: "AI 网站审计",
    title: "看见 AI 如何读取",
    emphasis: "你的每一页。",
    summary:
      "逐页检查 robots、访问状态、JavaScript 渲染、正文可见性、结构化表达、事实完整度与引用潜力。",
    theme: "cream",
    highlights: [
      { value: "逐页", label: "机器可读检查" },
      { value: "7 类", label: "技术与内容问题" },
      { value: "可复测", label: "修复结果验证" },
    ],
    sections: [
      {
        eyebrow: "访问性",
        title: "发现 AI 根本看不到的内容",
        body: "检查 robots.txt、防火墙、登录墙、状态码、超时、地区限制和客户端渲染问题。",
      },
      {
        eyebrow: "可理解性",
        title: "把复杂页面转成清晰事实",
        body: "判断产品定位、适用对象、功能、价格、限制、服务方式和证据是否能被模型稳定抽取。",
      },
      {
        eyebrow: "引用潜力",
        title: "比较被引用页面与未被引用页面",
        body: "从主题匹配、信息密度、原创证据、更新时间和第三方可信度等角度解释差异。",
      },
      {
        eyebrow: "复测",
        title: "修复后用相同标准重新检查",
        body: "保留每次审计结果和页面快照，避免优化建议完成后无法证明技术问题是否真正消失。",
      },
    ],
    related: [
      "platform/content-delivery",
      "how-tos/audit-website",
      "faqs/technical-blockers",
    ],
  },
  {
    path: "platform/content-delivery",
    kind: "product",
    kicker: "AI 内容交付",
    title: "为智能体提供一套",
    emphasis: "更清晰的网站。",
    summary:
      "在不改变人类访问体验的前提下，为经过验证的 AI 智能体输出轻量、结构清晰、事实明确的内容版本。",
    theme: "brown",
    highlights: [
      { value: "Intercept", label: "识别智能体" },
      { value: "Translate", label: "结构化转换" },
      { value: "Serve", label: "边缘交付" },
    ],
    sections: [
      {
        eyebrow: "识别",
        title: "只处理经过验证的 AI 流量",
        body: "在 CDN 或边缘层识别目标 User-Agent，并记录交付、状态和内容版本。",
      },
      {
        eyebrow: "转换",
        title: "移除噪音，保留事实",
        body: "服务端渲染正文，压缩无关代码，并补齐标题层级、定义、FAQ、价格、限制与来源说明。",
      },
      {
        eyebrow: "交付",
        title: "保持人类网站与传统 SEO 不变",
        body: "用户继续看到原站，AI 智能体获得可快速解析的版本；每个输出都映射回唯一来源页面。",
      },
      {
        eyebrow: "治理",
        title: "可预览、可审批、可撤回",
        body: "上线前比较原页面与 AI 版本，配置审批人、同步规则和失效条件，避免出现过期或冲突事实。",
      },
    ],
    related: [
      "platform/agent-traffic",
      "platform/site-audit",
      "faqs/content-delivery",
    ],
  },
  {
    path: "platform/search-trends",
    kind: "product",
    kicker: "AI 搜索趋势",
    title: "看见用户正在向 AI",
    emphasis: "询问什么。",
    summary:
      "通过真实问题样本、主题聚类和趋势变化，发现需求增长、内容机会和品牌覆盖不足的领域。",
    theme: "mist",
    highlights: [
      { value: "主题", label: "问题自动聚类" },
      { value: "趋势", label: "需求上升与衰减" },
      { value: "覆盖", label: "品牌存在率基准" },
    ],
    sections: [
      {
        eyebrow: "趋势追踪",
        title: "识别增长和衰减中的主题",
        body: "按周和月查看问题规模变化，减少只依赖传统关键词量的盲区。",
      },
      {
        eyebrow: "问题发现",
        title: "找到用户真正使用的表达方式",
        body: "把同一意图下的自然语言问题聚合成主题，并保留平台、场景和客户旅程阶段。",
      },
      {
        eyebrow: "品牌基准",
        title: "把需求规模与品牌存在率放在一起",
        body: "优先处理需求增长快、商业价值高但品牌出现率低的主题。",
      },
      {
        eyebrow: "提示词扩展",
        title: "把趋势直接加入监测计划",
        body: "从主题中选择问题，一键生成豆包、千问、DeepSeek 等平台的监测变体。",
      },
    ],
    related: [
      "platform/ai-visibility",
      "how-tos/track-ai-search-trends",
      "labs/platform-adoption",
    ],
  },
  {
    path: "platform/account-pool",
    kind: "product",
    kicker: "国内 AI 号池",
    title: "稳定运行豆包与千问的",
    emphasis: "监测账号体系。",
    summary:
      "为管理员提供账号录入、健康检查、任务调度、频率控制、异常隔离和审计记录，为客户提供干净的结果视图。",
    theme: "lime",
    highlights: [
      { value: "双端", label: "管理员与客户隔离" },
      { value: "健康度", label: "账号状态评分" },
      { value: "可审计", label: "每次运行可追溯" },
    ],
    sections: [
      {
        eyebrow: "账号管理",
        title: "统一维护平台账号与会话状态",
        body: "记录账号归属、平台、地区、登录状态、最近成功时间、失败次数和可用配额。",
      },
      {
        eyebrow: "调度",
        title: "按健康度和频率分配任务",
        body: "避免单账号高频运行，通过轮询、冷却时间、并发限制和优先级队列提高稳定性。",
      },
      {
        eyebrow: "异常",
        title: "自动隔离验证码、风控和超时账号",
        body: "异常账号暂停接单并进入人工处理队列，任务自动切换到其他可用账号。",
      },
      {
        eyebrow: "证据",
        title: "知道每条回答由哪个运行产生",
        body: "回答保留账号匿名标识、采集时间、提示词版本、重试次数和采集器版本，便于审计。",
      },
    ],
    related: [
      "solutions/agencies",
      "platform/ai-visibility",
      "faqs/account-pool-management",
    ],
  },
];

const solutionPages: MarketingPage[] = [
  {
    path: "solutions/enterprise",
    kind: "solution",
    kicker: "企业级 GEO",
    title: "让多个品牌、市场和团队使用",
    emphasis: "同一套 AI 搜索事实。",
    summary:
      "面向集团与大型企业的多品牌监测、权限治理、数据接口和效果证明体系。",
    theme: "brown",
    highlights: [
      { value: "多品牌", label: "统一基准" },
      { value: "RBAC", label: "细粒度权限" },
      { value: "API", label: "连接 BI 与内部系统" },
    ],
    sections: [
      {
        title: "跨品牌和地区建立统一监测标准",
        body: "集中管理品牌实体、竞争对手、客户画像、主题和提示词，同时允许不同业务线保留自己的分析空间。",
        bullets: [
          "多组织、多项目和多语言",
          "统一指标口径",
          "品牌级与集团级视图",
          "跨市场异常比较",
        ],
      },
      {
        title: "安全、权限与审计从第一天开始",
        body: "管理员、分析师、内容团队、外部代理商和只读客户使用不同权限；关键操作、数据导出和配置变化全部记录。",
      },
      {
        title: "把数据接入现有增长系统",
        body: "通过 Data API、定时导出和 Webhook，把 GEO 指标送入 BI、CRM、内容平台和管理驾驶舱。",
      },
      {
        title: "从基线到规模化优化",
        body: "先选高价值主题建立基线，再扩展到更多品牌、市场和客户旅程阶段，避免一次性追踪大量无意义提示词。",
      },
    ],
    related: ["platform/ai-visibility", "platform/insights", "pricing"],
  },
  {
    path: "solutions/agencies",
    kind: "solution",
    kicker: "GEO 代理商",
    title: "把 AI 搜索监测变成",
    emphasis: "可规模化交付的服务。",
    summary:
      "管理员端负责官方 API Worker、任务和质量，客户端负责报告、证据和行动，让团队在一个工作区管理所有客户。",
    theme: "lime",
    highlights: [
      { value: "多客户", label: "统一工作区" },
      { value: "白标", label: "客户报告" },
      { value: "证据链", label: "证明服务价值" },
    ],
    sections: [
      {
        title: "快速建立潜客和客户环境",
        body: "输入品牌官网后生成竞争品牌、主题和初始提示词建议，用于售前审计与正式项目启动。",
        bullets: [
          "潜客体验环境",
          "CSV 批量导入",
          "SEO 关键词转问题",
          "AI 辅助提示词生成",
        ],
      },
      {
        title: "管理员与客户使用两套界面",
        body: "内部团队管理 API Worker、失败任务、采集频率和成本；客户只看到经过验证的结果、任务和报告。",
      },
      {
        title: "把洞察变成增值服务",
        body: "围绕监测、技术审计、内容优化、引用建设和效果复测设计服务包，而不是只转售一个软件账号。",
      },
      {
        title: "用证据链降低续费争议",
        body: "每项行动保留基线、发布时间、目标提示词和观察窗口，客户可以回到原始回答验证结果。",
      },
    ],
    related: ["platform/monitoring/citations", "platform/insights", "pricing"],
  },
  {
    path: "solutions/brands",
    kind: "solution",
    kicker: "品牌市场团队",
    title: "从不知道 AI 怎么说，变成",
    emphasis: "每周都有明确行动。",
    summary:
      "帮助品牌、公关、内容和 SEO 团队共同管理 AI 中的品牌事实、推荐语境和引用来源。",
    theme: "cream",
    highlights: [
      { value: "基线", label: "当前品牌表现" },
      { value: "机会", label: "内容与引用缺口" },
      { value: "证明", label: "优化前后对比" },
    ],
    sections: [
      {
        title: "先回答品牌目前在哪里",
        body: "选择最重要的客户旅程，监测非品牌问题、比较问题、产品问题和品牌事实问题。",
      },
      {
        title: "让不同团队看到同一个问题",
        body: "内容团队关注页面缺口，公关团队关注第三方来源，SEO 团队关注技术访问，品牌团队关注语境与份额。",
      },
      {
        title: "建立品牌事实源",
        body: "整理公司定义、产品能力、价格、服务边界、客户证据和常见问题，减少 AI 使用模糊或过期信息。",
      },
      {
        title: "持续验证而不是一次性优化",
        body: "用稳定采集与固定观察窗口确认效果，并跟踪模型和平台差异。",
      },
    ],
    related: [
      "platform/ai-visibility",
      "resources/guides/geo-basics",
      "how-tos/build-geo-baseline",
    ],
  },
  {
    path: "solutions/ecommerce",
    kind: "solution",
    kicker: "电商与消费品牌",
    title: "知道哪些商品正在被 AI",
    emphasis: "比较、推荐与忽略。",
    summary:
      "按品类、产品和购买场景追踪 AI 推荐，识别产品事实、评价与渠道内容对答案的影响。",
    theme: "mist",
    highlights: [
      { value: "SKU", label: "产品级监测" },
      { value: "场景", label: "购买意图拆分" },
      { value: "渠道", label: "电商与内容来源" },
    ],
    sections: [
      {
        title: "追踪产品级推荐表现",
        body: "围绕用途、预算、人群、对比和购买问题建立监测，不只看品牌是否出现。",
      },
      {
        title: "定位影响推荐的事实",
        body: "分析规格、价格、口碑、适用人群、售后和渠道信息是否在不同来源中一致。",
      },
      {
        title: "识别榜单与社区影响",
        body: "查看媒体评测、社区讨论、电商详情和用户评价被引用的情况。",
      },
      {
        title: "连接销售结果",
        body: "把 AI 推荐变化与站内搜索、详情页访问、咨询和成交趋势放在同一时间线上。",
      },
    ],
    related: [
      "platform/ai-visibility",
      "platform/citations",
      "labs/traffic-conversion",
    ],
  },
];

const guidePages: MarketingPage[] = [
  {
    path: "resources/guides/geo-basics",
    kind: "guide",
    kicker: "GEO 指南 · 第一章",
    title: "没有废话的",
    emphasis: "生成式搜索优化入门。",
    summary:
      "理解 AI 搜索改变了什么、该测量什么，以及品牌如何从第一条基线开始。",
    updated: "2026-08-14",
    readTime: "12 分钟",
    sections: [
      {
        title: "AI 搜索和传统搜索有什么不同",
        body: "传统搜索返回链接列表，AI 搜索会把多个来源压缩成一个回答。品牌竞争的不只是点击和排名，还包括是否被提及、如何被描述、是否被引用以及在答案中的位置。",
      },
      {
        title: "第一批应该监测的指标",
        body: "从品牌提及率、竞争声音份额、首次出现位置、引用覆盖率、情绪和 AI 引荐流量开始。不要一开始创造过多综合分数。",
        bullets: [
          "品牌出现与否",
          "竞争品牌共同出现",
          "自有与第三方引用",
          "平台差异",
          "随时间变化",
        ],
      },
      {
        title: "选择真正重要的主题",
        body: "先选择一到两个直接影响购买和品牌认知的主题，混合品牌词、非品牌问题、比较问题和问题解决型问题。",
      },
      {
        title: "发布、监测、迭代",
        body: "每次优化都记录目标页面、发布时间、目标提示词和期望指标，在至少两到三周的稳定窗口内复测。",
      },
    ],
    related: [
      "resources/guides/monitoring",
      "how-tos/build-geo-baseline",
      "faqs/what-is-geo",
    ],
  },
  {
    path: "resources/guides/monitoring",
    kind: "guide",
    kicker: "GEO 指南 · 第二章",
    title: "如何建立可靠的",
    emphasis: "AI 搜索监测体系。",
    summary:
      "从品牌实体、提示词分层、平台运行到原始回答证据，建立可以长期比较的监测方法。",
    updated: "2026-08-14",
    readTime: "15 分钟",
    sections: [
      {
        title: "定义品牌实体和竞争边界",
        body: "记录品牌正式名称、常见别名、产品线、官网域名和容易混淆的实体；竞争对手既包括业务竞争者，也包括 AI 经常推荐的替代方案。",
      },
      {
        title: "按客户旅程设计提示词",
        body: "将提示词分为认知、问题、比较、评估、购买和品牌事实，并为每个主题保留稳定核心问题。",
      },
      {
        title: "控制采集变量",
        body: "固定平台、账号地区、语言、运行频率和提示词版本；记录失败、超时、验证码和平台版本变化。",
      },
      {
        title: "指标必须回到证据",
        body: "任何提及率、位置或情绪指标都应该能够回到完整回答、解析规则和引用来源。",
      },
    ],
    related: [
      "platform/ai-visibility",
      "how-tos/track-brand-presence",
      "faqs/how-many-prompts",
    ],
  },
  {
    path: "resources/guides/insights",
    kind: "guide",
    kicker: "GEO 指南 · 第三章",
    title: "从 AI 数据中找到",
    emphasis: "真正可执行的机会。",
    summary: "判断差距来自内容、技术、第三方来源还是产品事实，并给行动排序。",
    updated: "2026-08-14",
    readTime: "11 分钟",
    sections: [
      {
        title: "先解释差距，不要急着产内容",
        body: "品牌没有出现可能因为平台看不到官网、页面与问题不匹配、第三方权威不足或产品事实不清楚。",
      },
      {
        title: "分析被引用页面的共同特征",
        body: "比较结构、信息密度、事实明确度、更新时间、原创数据和外部可信度。",
      },
      {
        title: "优先级使用商业价值与可实现性",
        body: "高需求、高价值、差距明显且有可控来源的机会优先；不要只追逐容易提升但与业务无关的问题。",
      },
      {
        title: "行动要定义验证方式",
        body: "内容优化、技术修复和第三方建设需要不同观察周期和验证指标。",
      },
    ],
    related: [
      "platform/insights",
      "platform/citations",
      "how-tos/prioritize-geo-actions",
    ],
  },
  {
    path: "resources/guides/domestic-platforms",
    kind: "guide",
    kicker: "国内平台指南",
    title: "豆包、千问和 DeepSeek",
    emphasis: "应该怎么监测。",
    summary:
      "理解三家官方 API 在模型、回答、引用、联网搜索和运行稳定性方面的差异。",
    updated: "2026-08-14",
    readTime: "14 分钟",
    sections: [
      {
        title: "不要把平台当成同一种模型",
        body: "不同产品可能使用搜索、知识库、插件或不同模型版本，同一问题的引用和品牌推荐方式会明显不同。",
      },
      {
        title: "模型与搜索模式是重要变量",
        body: "保留服务商、模型版本、直接回答或联网搜索、地区和运行时间，避免把条件差异误判为优化效果。",
      },
      {
        title: "引用并不总是完整可见",
        body: "平台可能展示链接、来源名称、卡片或不显示来源。系统需要分别保存可见引用、正文提及和可推断来源。",
      },
      {
        title: "比较应使用相同问题集合",
        body: "跨平台比较时使用相同意图和近似表达，同时记录平台特有的问题改写。",
      },
    ],
    related: [
      "platform/monitoring/citations",
      "faqs/platform-coverage",
      "how-tos/compare-platforms",
    ],
  },
];

const howToDefinitions = [
  [
    "how-tos/build-geo-baseline",
    "建立第一份 GEO 基线报告",
    "从品牌实体、竞争对手和最多 10 个核心问题开始，建立可重复的 AI 可见度基线。",
    [
      "确定一个高价值业务主题",
      "整理品牌别名和 5–10 个竞争品牌",
      "设计品牌、非品牌、比较和购买问题",
      "在目标平台完成至少两轮采集",
      "保存原始回答并计算基础指标",
    ],
  ],
  [
    "how-tos/track-brand-presence",
    "追踪品牌在 AI 搜索中的出现",
    "按平台、主题和提示词查看品牌提及、位置、情绪与竞争声音份额。",
    [
      "先查看整体品牌提及率",
      "按主题和平台过滤",
      "进入单条提示词查看原始回答",
      "比较固定时间窗口",
      "把异常变化转为调查任务",
    ],
  ],
  [
    "how-tos/track-citations",
    "追踪 AI 回答中的引用来源",
    "识别 AI 引用了哪些网站、具体页面和内容类型。",
    [
      "从高价值问题开始",
      "提取回答中的显式链接和来源名",
      "按域名、URL 和类型聚合",
      "比较自有、竞争与第三方引用",
      "建立目标来源清单",
    ],
  ],
  [
    "how-tos/track-ai-bot-traffic",
    "追踪 AI 智能体访问网站",
    "连接服务器或 CDN 日志，区分检索、索引和训练机器人。",
    [
      "确认可获取的日志字段",
      "维护 User-Agent 识别规则",
      "过滤内部与安全扫描流量",
      "按访问类型和页面聚合",
      "与引用变化建立时间关联",
    ],
  ],
  [
    "how-tos/audit-website",
    "审计网站的 AI 可读性",
    "检查访问、渲染、结构、事实和引用潜力。",
    [
      "检查 robots 与防火墙",
      "验证无 JavaScript 正文",
      "整理产品、价格和限制",
      "增加明确标题、摘要与 FAQ",
      "修复后重新抓取并保存快照",
    ],
  ],
  [
    "how-tos/optimize-content",
    "为 AI 搜索优化内容",
    "让页面更容易被检索、理解、引用和准确复述。",
    [
      "确认页面对应的用户问题",
      "把关键事实提前",
      "使用描述性标题和定义",
      "增加原创证据与来源",
      "发布后监测引用和提及变化",
    ],
  ],
  [
    "how-tos/compare-platforms",
    "比较豆包、千问与 DeepSeek 表现",
    "使用一致问题集分析不同平台上的品牌差异。",
    [
      "创建相同意图的问题组",
      "记录平台特有的表达变体",
      "统一采集时间、模型档位与回答模式",
      "分别比较提及、位置与引用",
      "识别平台专属优化机会",
    ],
  ],
  [
    "how-tos/track-ai-search-trends",
    "追踪 AI 搜索主题趋势",
    "发现用户需求正在增长、稳定还是衰减。",
    [
      "建立主题词典",
      "持续收集真实问题样本",
      "对问题做意图与主题聚类",
      "比较周度和月度变化",
      "把高价值主题加入监测",
    ],
  ],
  [
    "how-tos/prioritize-geo-actions",
    "给 GEO 优化行动排序",
    "用商业价值、差距、可控性和验证周期确定优先级。",
    [
      "估算问题的业务价值",
      "测量品牌与竞争差距",
      "判断差距来自技术、内容还是第三方",
      "估算所需资源和观察周期",
      "定义成功指标后再创建任务",
    ],
  ],
] as const;

const howToPages: MarketingPage[] = howToDefinitions.map(
  ([path, title, summary, steps]) => ({
    path,
    kind: "howto",
    kicker: "GEO 实操指南",
    title: `如何${title}`,
    summary,
    updated: "2026-08-14",
    readTime: "8–12 分钟",
    sections: [
      { title: "快速答案", body: summary },
      ...steps.map((step, index) => ({
        eyebrow: `步骤 ${index + 1}`,
        title: step,
        body: `完成“${step}”时，需要记录输入、执行人、时间和判断标准。不要只保留结论，确保后续可以使用相同条件复测。`,
      })),
      {
        title: "如何判断是否有效",
        body: "建立优化前基线，并在发布后使用相同平台、提示词和运行规则观察至少两到三周。回到原始回答验证指标变化是否来自真实内容变化。",
      },
    ],
    related: [
      "resources/guides/geo-basics",
      "platform/ai-visibility",
      "faqs/how-long-to-see-results",
    ],
  }),
);

const faqDefinitions = [
  [
    "faqs/what-is-geo",
    "什么是 GEO，它和 SEO 有什么区别？",
    "GEO 是围绕生成式 AI 回答进行的可见度、引用与品牌表达优化。SEO 主要争取传统搜索结果中的排名与点击；GEO 还关注品牌是否进入答案、被如何描述以及引用了什么来源。",
  ],
  [
    "faqs/platform-coverage",
    "Quarzion 可以监测哪些国内 AI 平台？",
    "当前正式版本通过官方 API 监测豆包、千问和 DeepSeek，并分别记录模型版本、直接回答、联网搜索、服务商请求 ID 与可见引用。",
  ],
  [
    "faqs/how-many-prompts",
    "一个品牌应该追踪多少条提示词？",
    "当前内测版每个项目最多启用 10 条核心提示词，先覆盖认知、比较、评估和购买阶段；后续再根据真实运行成本扩容。",
  ],
  [
    "faqs/accuracy",
    "品牌提及和排名识别准确吗？",
    "系统保存完整回答，并使用品牌名称、别名、产品名和上下文规则识别实体。低置信度结果进入人工复核，所有汇总指标都能回到原文。",
  ],
  [
    "faqs/data-collection",
    "Quarzion 如何采集 AI 平台数据？",
    "当前正式版本只使用平台官方 API。每次任务记录平台、模型版本、回答模式、服务商请求 ID、Token、重试、采集器版本、原始回答与引用。",
  ],
  [
    "faqs/account-pool-management",
    "豆包和千问号池应该如何管理？",
    "管理员端统一维护账号健康度、登录状态、冷却时间、并发限制和失败原因。任务按健康度分配，出现验证码、风控或超时时自动隔离并切换账号。",
  ],
  [
    "faqs/citations",
    "系统只统计引用次数吗？",
    "不仅统计次数，还记录具体 URL、域名、页面类型、覆盖提示词、首次出现时间、关联品牌和自有/第三方来源属性。",
  ],
  [
    "faqs/sentiment",
    "如何判断 AI 对品牌的情绪？",
    "系统基于品牌出现的上下文判断正向、混合和负向语境，并保留原句供人工验证。情绪分数用于趋势判断，不应脱离原文单独使用。",
  ],
  [
    "faqs/position",
    "品牌在答案中的位置为什么重要？",
    "同样被提及，出现在首个推荐、列表中部或补充说明中的影响不同。系统记录首次出现位置和前三提及率，帮助区分曝光质量。",
  ],
  [
    "faqs/technical-blockers",
    "哪些技术问题会让 AI 看不到网站？",
    "常见问题包括 robots 或防火墙拦截、客户端 JavaScript 才显示正文、登录墙、超时、错误状态码、重要事实隐藏在交互组件中，以及多个页面事实互相冲突。",
  ],
  [
    "faqs/content-delivery",
    "向 AI 提供专门内容是否属于隐藏内容？",
    "关键在于事实一致、来源明确和治理透明。AI 版本应来自人类网站的真实事实，不应针对搜索排名提供虚假或矛盾内容，并应保留审计、预览和撤回能力。",
  ],
  [
    "faqs/competitor-benchmarking",
    "可以同时比较多少个竞争品牌？",
    "试点建议每个主题选择 5–10 个直接竞争者和 AI 经常推荐的替代品牌。过多竞争者会稀释分析，应优先保证实体识别准确。",
  ],
  [
    "faqs/change-over-time",
    "如何判断可见度真的在改善？",
    "比较相同平台、提示词和采集规则下的固定窗口，至少观察两到三周，并检查变化是否集中在目标主题和目标页面，而不是一次性模型波动。",
  ],
  [
    "faqs/how-long-to-see-results",
    "GEO 优化多久能看到结果？",
    "技术访问问题修复可能较快被检测到；内容与引用变化通常需要更长时间。建议为不同动作设置独立观察周期，而不是承诺统一的天数。",
  ],
  [
    "faqs/roles-permissions",
    "管理员端和客户端有什么区别？",
    "管理员端管理官方 API Worker、任务、异常、采集成本和质量；客户端查看监测结果、原始证据、行动任务和交付报告，两者权限与数据范围隔离。",
  ],
  [
    "faqs/export-api",
    "可以导出数据或通过 API 获取吗？",
    "产品架构支持按项目导出提示词、运行、回答、提及、引用、行动和证据快照，也可以通过 API 接入 BI 或内部系统。",
  ],
  [
    "faqs/security",
    "企业数据和账号如何保护？",
    "供应商 API 密钥只保存在采集节点环境变量中，不进入客户端或数据库；系统通过组织与项目权限隔离数据，并记录关键配置和操作日志。",
  ],
  [
    "faqs/measure-roi",
    "如何证明 GEO 服务的 ROI？",
    "先证明可控的中间结果：品牌提及、位置、引用和目标主题覆盖，再连接 AI 引荐访问、咨询和成交。每项行动必须有基线、发布时间和验证窗口。",
  ],
  [
    "faqs/third-party-vs-owned",
    "应该优先优化官网还是第三方引用？",
    "取决于目标问题的引用结构。如果 AI 主要依赖第三方来源，应加强媒体、榜单、社区和合作伙伴内容；如果自有页面相关但不可读，应先修复官网。",
  ],
  [
    "faqs/free-trial",
    "是否可以先做试点？",
    "当前内测从一个品牌、一个市场、最多 10 条核心提示词和豆包、千问、DeepSeek 三个平台开始，先验证真实数据与报告流程。",
  ],
] as const;

const faqPages: MarketingPage[] = faqDefinitions.map(
  ([path, title, answer]) => ({
    path,
    kind: "faq",
    kicker: "GEO 常见问题",
    title,
    summary: answer,
    updated: "2026-08-14",
    sections: [
      { title: "简要回答", body: answer },
      {
        title: "实际使用时应该注意什么",
        body: "任何 GEO 判断都应该说明平台、时间、提示词集合和数据来源。不同平台和模型版本可能产生差异，因此需要保留原始回答并使用稳定窗口比较。",
      },
      {
        title: "Quarzion 中如何处理",
        body: "系统将配置、运行、回答、解析结果和引用证据关联起来，让团队既能查看汇总趋势，也能回到单次运行复核。",
      },
    ],
    related: ["faqs", "resources/guides/geo-basics", "platform/ai-visibility"],
  }),
);

const labDefinitions = [
  [
    "labs/citation-dynamics",
    "AI 引用动力学",
    "第三方来源如何塑造非品牌问题中的品牌推荐",
    "89.6%",
    "非品牌问题中的第三方引用占比（演示研究样本）",
  ],
  [
    "labs/platform-adoption",
    "国内 AI 平台采用趋势",
    "用户如何在豆包、千问、DeepSeek 与 Kimi 之间分配搜索行为",
    "4 类",
    "主要 AI 搜索使用场景",
  ],
  [
    "labs/query-behavior",
    "问题与提示词行为",
    "自然语言问题如何从信息查询演变为比较和购买决策",
    "6 阶段",
    "AI 客户旅程问题结构",
  ],
  [
    "labs/ai-crawling",
    "AI 爬虫访问研究",
    "检索、索引和训练智能体对企业网站的访问差异",
    "3 种",
    "主要智能体访问类型",
  ],
  [
    "labs/traffic-conversion",
    "AI 流量与转化",
    "品牌进入 AI 答案后，访问、咨询与转化可能如何变化",
    "+41%",
    "高意图 AI 引荐访问的演示提升",
  ],
  [
    "labs/content-structure",
    "内容结构与引用",
    "定义、FAQ、数据与比较模块对引用潜力的影响",
    "2.7×",
    "结构完整页面的演示引用差异",
  ],
] as const;

const labPages: MarketingPage[] = labDefinitions.map(
  ([path, title, summary, value, label]) => ({
    path,
    kind: "lab",
    kicker: "Quarzion Labs",
    title,
    summary,
    theme: "brown",
    updated: "2026-08-14",
    highlights: [{ value, label }],
    sections: [
      { title: "核心发现", body: summary, stat: { value, label } },
      {
        title: "研究方法",
        body: "本演示研究使用匿名提示词样本、可见引用和多平台回答进行聚合。正式对外发布前，任何数字都需要补充样本范围、时间窗口、平台分布和误差说明。",
      },
      {
        title: "对品牌意味着什么",
        body: "品牌不能只优化自有网站，也需要理解 AI 在特定问题中依赖的第三方事实源、内容结构和检索路径。",
      },
      {
        title: "可以采取的行动",
        body: "选择业务价值最高的主题建立基线，识别自有内容和第三方来源缺口，完成优化后使用相同问题集复测。",
      },
    ],
    related: ["labs", "platform/citations", "resources/guides/insights"],
  }),
);

const caseDefinitions = [
  [
    "case-studies/consumer-brand",
    "消费品牌用 90 天建立 AI 推荐基线",
    "286%",
    "非品牌问题中的品牌可见度演示增长",
    "从分散截图变成持续监测与证据交付",
  ],
  [
    "case-studies/b2b-software",
    "B2B 软件品牌提升高意图问题覆盖",
    "4×",
    "进入采购比较问题的演示增长",
    "把产品事实、比较内容和第三方引用放在同一计划中",
  ],
  [
    "case-studies/agency-growth",
    "代理商将 GEO 变成可续费的客户服务",
    "12",
    "统一管理的客户品牌",
    "管理员号池、客户报告和优化证明分端运行",
  ],
  [
    "case-studies/ecommerce",
    "电商品牌找到影响 AI 推荐的产品事实",
    "68%",
    "重点产品问题覆盖率",
    "连接产品页、媒体评测和电商渠道内容",
  ],
  [
    "case-studies/group-brands",
    "集团建立多品牌统一 GEO 指标",
    "8",
    "纳入统一基准的品牌",
    "统一指标口径，同时保留业务线权限",
  ],
  [
    "case-studies/technical-recovery",
    "修复 JavaScript 与访问限制后恢复 AI 抓取",
    "93%",
    "重点页面可访问率",
    "技术审计、修复与复测形成完整证据",
  ],
] as const;

const casePages: MarketingPage[] = caseDefinitions.map(
  ([path, title, value, label, summary]) => ({
    path,
    kind: "case",
    kicker: "客户方法案例",
    title,
    summary,
    theme: "brown",
    updated: "2026-08-14",
    highlights: [{ value, label }],
    sections: [
      {
        title: "挑战",
        body: "团队已经在做内容、SEO 和品牌传播，但无法持续观察 AI 如何描述品牌，也无法向内部或客户证明一次优化是否有效。",
      },
      {
        title: "基线与方案",
        body: summary,
        bullets: [
          "明确目标主题与客户旅程",
          "建立固定提示词和平台基线",
          "保留原始回答与引用",
          "将内容、技术和来源行动分别管理",
        ],
      },
      {
        title: "执行",
        body: "团队先解决影响范围最大的技术和事实问题，再针对高价值提示词补充内容与第三方可信来源。每个动作都绑定负责人、页面和验证窗口。",
      },
      {
        title: "结果与解释",
        body: `${value} ${label}。这里的数字用于演示完整案例页面的表达方式，正式客户案例发布时应替换为经过客户授权且可复核的数据。`,
        stat: { value, label },
      },
      {
        title: "下一步",
        body: "把有效方法扩展到更多主题和平台，同时保留稳定问题集，用于长期识别模型变化与品牌真实增长。",
      },
    ],
    related: ["case-studies", "platform/ai-visibility", "solutions/agencies"],
  }),
);

const articleDefinitions = [
  [
    "blog/geo-roi",
    "如何证明 GEO 的投入产出，而不是只展示分数",
    "将可见度、引用与业务结果连接成可审计的归因链。",
  ],
  [
    "blog/domestic-ai-search",
    "国内 AI 搜索正在形成怎样的客户旅程",
    "从问答、比较、搜索增强到智能体操作，理解新的品牌触点。",
  ],
  [
    "blog/citation-first",
    "为什么引用往往是 GEO 的第一突破口",
    "AI 需要来源来支撑答案，来源结构决定品牌能否稳定进入推荐。",
  ],
  [
    "blog/prompt-research",
    "不要把 SEO 关键词原样搬进提示词库",
    "AI 问题更长、更有场景，也更接近真实决策过程。",
  ],
  [
    "blog/account-pool-operations",
    "豆包与千问号池运营的五个关键控制点",
    "健康度、冷却时间、任务队列、异常隔离与审计缺一不可。",
  ],
  [
    "blog/geo-reporting",
    "一份客户愿意续费的 GEO 报告应该包含什么",
    "从结果、证据、解释到行动和验证窗口，而不是只发截图。",
  ],
  [
    "blog/ai-readable-content",
    "什么样的页面更容易被 AI 理解和引用",
    "明确事实、清晰结构、原创证据和一致来源比堆砌术语更重要。",
  ],
  [
    "blog/monitoring-volatility",
    "如何处理 AI 回答的随机性和波动",
    "固定变量、重复采集、时间窗口和原始回答是可靠判断的基础。",
  ],
] as const;

const articlePages: MarketingPage[] = articleDefinitions.map(
  ([path, title, summary]) => ({
    path,
    kind: "article",
    kicker: "GEO 观察",
    title,
    summary,
    updated: "2026-08-14",
    readTime: "7 分钟",
    sections: [
      { title: "问题是什么", body: summary },
      {
        title: "常见误区",
        body: "最常见的错误是只看一次回答、只追踪品牌词、把平台波动当成优化结果，或者给出无法回到原始证据的综合分数。",
      },
      {
        title: "更可靠的方法",
        body: "明确业务主题和成功指标，固定平台与问题集合，保留完整回答和引用，再把变化与具体行动放在同一时间线上。",
      },
      {
        title: "如何落地",
        body: "先完成一个小规模试点：一个品牌、一个市场、三个官方 API 平台和最多 10 条核心问题。验证采集与报告流程后再扩展。",
      },
    ],
    related: ["blog", "resources/guides/geo-basics", "platform/insights"],
  }),
);

const toolPages: MarketingPage[] = [
  {
    path: "tools/contact",
    kind: "tool",
    kicker: "免费工具",
    title: "AI 品牌可见度快检",
    summary: "输入品牌官网，生成一份示例基线结构与需要追踪的问题清单。",
    theme: "lime",
    sections: [
      {
        title: "你会得到什么",
        body: "品牌实体建议、竞争品牌候选、主题方向、平台选择和样例问题。正式监测需要连接运行系统。",
      },
    ],
  },
  {
    path: "tools/prompt-generator",
    kind: "tool",
    kicker: "免费工具",
    title: "GEO 提示词生成器",
    summary: "根据品牌、产品和客户画像生成认知、比较、评估与购买阶段的问题。",
    theme: "mist",
    sections: [
      {
        title: "生成原则",
        body: "输出同时包含品牌问题与非品牌问题，并标记主题、意图、客户旅程和适合的平台。",
      },
    ],
  },
  {
    path: "tools/ai-crawler-check",
    kind: "tool",
    kicker: "免费工具",
    title: "AI 爬虫可访问性检查",
    summary: "检查 robots、关键页面状态和无 JavaScript 内容是否可见。",
    theme: "brown",
    sections: [
      {
        title: "检查范围",
        body: "包括 robots.txt、HTTP 状态、正文渲染、标题描述、结构与关键事实可见性。",
      },
    ],
  },
];

const companyPages: MarketingPage[] = [
  {
    path: "about",
    kind: "company",
    kicker: "关于 Quarzion",
    title: "为 AI 时代建立一套",
    emphasis: "可信的品牌事实系统。",
    summary:
      "Quarzion 希望让品牌知道 AI 在说什么、为什么这样说，以及一次优化是否真的产生了变化。",
    sections: [
      {
        title: "我们解决的问题",
        body: "AI 回答正在进入品牌发现和购买决策，但大多数团队缺少持续监测、原始证据和统一交付流程。",
      },
      {
        title: "我们的原则",
        body: "指标必须能回到原始回答；平台差异必须被记录；结果不能脱离时间、提示词和采集条件；演示数据必须明确标记。",
      },
      {
        title: "产品方向",
        body: "客户监测与证明系统、官方 API 运营后台、AI 内容与引用情报，以及面向国内平台的方法研究。",
      },
    ],
  },
  {
    path: "contact",
    kind: "company",
    kicker: "产品演示",
    title: "带上一个品牌，",
    emphasis: "我们从真实问题开始。",
    summary:
      "预约演示时可以提供品牌官网、主要产品、目标客户和最关注的三个 AI 平台。",
    sections: [
      {
        title: "演示包含",
        body: "品牌实体与竞争边界、提示词框架、官方 API 监测方法、结果报告与证据链架构。",
      },
      {
        title: "建议准备",
        body: "一个品牌官网、一到两个高价值业务主题、五个主要竞争品牌，以及目前最想证明的 GEO 服务结果。",
      },
    ],
  },
];

const pricingPage: MarketingPage = {
  path: "pricing",
  kind: "pricing",
  kicker: "价格与方案",
  title: "从一个品牌开始，",
  emphasis: "扩展到完整客户矩阵。",
  summary: "当前只开放正式内测申请；价格、配额与交付范围按项目确认。",
  theme: "cream",
  sections: [
    {
      title: "品牌版",
      body: "适合企业市场团队建立第一套 AI 搜索基线。",
      bullets: [
        "1 个正式客户组织与项目",
        "豆包、千问与 DeepSeek 官方 API",
        "每项目最多 10 条核心提示词",
        "每日调度与手动运行",
        "原始回答、引用、请求 ID 与哈希",
      ],
    },
    {
      title: "增长版",
      body: "适合多产品线或持续运营的增长团队。",
      bullets: [
        "多个正式客户项目",
        "主旗舰与次旗舰模型",
        "直接回答与联网搜索对比",
        "管理员任务与异常控制",
        "组织权限与审计记录",
      ],
    },
    {
      title: "代理商版",
      body: "适合 GEO 服务商管理多个客户和官方 API 任务。",
      bullets: [
        "多客户工作区",
        "管理员 API Worker 控制台",
        "客户独立门户",
        "角色权限与审计",
        "可扩展运行配额",
      ],
    },
    {
      title: "企业版",
      body: "适合集团、多品牌与内部数据集成。",
      bullets: [
        "按项目确认品牌与提示词规模",
        "组织管理员、成员与只读权限",
        "运行、回答与引用数据导出",
        "新加坡主站与上海采集节点",
        "备份、日志、限流与异常通知",
      ],
    },
  ],
  related: ["solutions/brands", "solutions/agencies", "solutions/enterprise"],
};

function indexPage(
  path: string,
  kicker: string,
  title: string,
  summary: string,
  related: string[],
): MarketingPage {
  return { path, kind: "index", kicker, title, summary, sections: [], related };
}

const indexPages: MarketingPage[] = [
  indexPage(
    "resources",
    "资源中心",
    "从监测到优化的 GEO 知识库",
    "指南、实操、常见问题与 GEO 观察组成一套可以持续更新的内容体系。",
    ["resources/guides/geo-basics", "how-tos", "faqs", "blog"],
  ),
  indexPage(
    "how-tos",
    "实操指南",
    "一步一步完成 GEO 工作",
    "每篇指南对应一个明确任务，并给出输入、操作、证据和验证方法。",
    howToPages.map((page) => page.path),
  ),
  indexPage(
    "faqs",
    "常见问题",
    "直接回答客户会搜索的问题",
    "覆盖监测方法、平台、技术、内容、效果证明、安全与价格。",
    faqPages.map((page) => page.path),
  ),
  indexPage(
    "labs",
    "Quarzion Labs",
    "用数据研究 AI 搜索行为",
    "研究引用、问题、平台采用、爬虫、内容结构与转化。演示研究与正式结论明确区分。",
    labPages.map((page) => page.path),
  ),
  indexPage(
    "case-studies",
    "客户方法案例",
    "从挑战、行动到可验证结果",
    "使用完整案例结构说明 GEO 服务如何交付。演示数字会明确标记，真实案例需客户授权。",
    casePages.map((page) => page.path),
  ),
  indexPage(
    "blog",
    "GEO 观察",
    "理解正在变化的 AI 搜索",
    "关于国内平台、内容、引用、官方 API 监测和效果证明的持续观察。",
    articlePages.map((page) => page.path),
  ),
  indexPage(
    "tools",
    "免费 GEO 工具",
    "先用一个具体问题开始",
    "品牌快检、提示词生成与 AI 爬虫检查帮助团队建立第一份基线。",
    toolPages.map((page) => page.path),
  ),
];

const faqCategoryPages: MarketingPage[] = [
  indexPage(
    "faqs/category/strategy",
    "策略 FAQ",
    "GEO 应该从哪里开始？",
    "解释 GEO 与 SEO 的关系、提示词规模、项目基线和见效周期。",
    [
      "faqs/what-is-geo",
      "faqs/how-many-prompts",
      "faqs/change-over-time",
      "faqs/how-long-to-see-results",
    ],
  ),
  indexPage(
    "faqs/category/features",
    "功能 FAQ",
    "监测、引用与竞争分析怎么工作？",
    "了解提及、位置、情绪、引用和竞争基准的计算与证据。",
    [
      "faqs/accuracy",
      "faqs/citations",
      "faqs/sentiment",
      "faqs/position",
      "faqs/competitor-benchmarking",
    ],
  ),
  indexPage(
    "faqs/category/integrations",
    "集成 FAQ",
    "数据如何采集、导出和连接？",
    "说明国内 AI 平台官方 API 采集、任务调度与数据导出。",
    ["faqs/data-collection", "faqs/export-api", "faqs/platform-coverage"],
  ),
  indexPage(
    "faqs/category/security",
    "安全 FAQ",
    "企业团队如何安全使用 Quarzion？",
    "覆盖密钥隔离、组织权限、审计日志和数据治理。",
    ["faqs/security", "faqs/roles-permissions", "faqs/technical-blockers"],
  ),
  indexPage(
    "faqs/category/pricing",
    "价格 FAQ",
    "试点、采购与 ROI 怎么判断？",
    "从试点范围、结果周期和投资回报证明三个角度回答采购问题。",
    ["faqs/free-trial", "faqs/how-long-to-see-results", "faqs/measure-roi"],
  ),
  indexPage(
    "faqs/category/agencies",
    "代理商 FAQ",
    "如何把 GEO 做成可交付服务？",
    "面向代理商的官方 API 任务、权限、客户报告和效果证明问题。",
    ["faqs/roles-permissions", "faqs/measure-roi", "faqs/export-api"],
  ),
  indexPage(
    "faqs/category/customers",
    "客户 FAQ",
    "客户最关心的结果与证据",
    "解释品牌为什么出现、如何改善以及何时可以验证。",
    [
      "faqs/change-over-time",
      "faqs/third-party-vs-owned",
      "faqs/measure-roi",
      "faqs/free-trial",
    ],
  ),
  indexPage(
    "faqs/category/market",
    "市场 FAQ",
    "不同 AI 平台有什么差异？",
    "理解国内 AI 搜索生态、平台覆盖和答案差异。",
    [
      "faqs/platform-coverage",
      "faqs/data-collection",
      "faqs/competitor-benchmarking",
      "faqs/third-party-vs-owned",
    ],
  ),
];

const howToCategoryPages: MarketingPage[] = [
  indexPage(
    "how-tos/category/brand-monitoring",
    "品牌监测",
    "追踪品牌在 AI 答案中的存在",
    "从基线、提及、位置和跨平台差异开始。",
    [
      "how-tos/build-geo-baseline",
      "how-tos/track-brand-presence",
      "how-tos/compare-platforms",
    ],
  ),
  indexPage(
    "how-tos/category/citation-tracking",
    "引用追踪",
    "找到塑造 AI 答案的来源",
    "识别域名、页面、来源类型与引用机会。",
    ["how-tos/track-citations", "how-tos/optimize-content"],
  ),
  indexPage(
    "how-tos/category/ai-traffic-analysis",
    "AI 流量分析",
    "识别访问网站的 AI Agent",
    "连接日志并区分检索、索引和训练型访问。",
    ["how-tos/track-ai-bot-traffic", "how-tos/audit-website"],
  ),
  indexPage(
    "how-tos/category/site-auditing",
    "网站审计",
    "检查 AI 能否访问、理解和引用网站",
    "从技术访问到事实结构逐项验证。",
    ["how-tos/audit-website", "how-tos/optimize-content"],
  ),
  indexPage(
    "how-tos/category/content-optimization",
    "内容优化",
    "把监测结果转成页面改进",
    "针对问题意图重组事实、证据与页面结构。",
    ["how-tos/optimize-content", "how-tos/prioritize-geo-actions"],
  ),
  indexPage(
    "how-tos/category/content-delivery",
    "内容交付",
    "为 AI Agent 交付清晰内容",
    "理解识别、转换、边缘交付和治理流程。",
    [
      "how-tos/audit-website",
      "how-tos/optimize-content",
      "how-tos/track-ai-bot-traffic",
    ],
  ),
  indexPage(
    "how-tos/category/competitive-benchmarking",
    "竞争基准",
    "比较品牌与竞争对手的 AI 表现",
    "用一致问题集比较答案份额、位置、引用和平台差异。",
    [
      "how-tos/track-brand-presence",
      "how-tos/compare-platforms",
      "how-tos/prioritize-geo-actions",
    ],
  ),
  indexPage(
    "how-tos/category/trend-exploration",
    "趋势探索",
    "发现正在增长的 AI 搜索主题",
    "把主题趋势、商业价值和品牌覆盖组合起来。",
    ["how-tos/track-ai-search-trends", "how-tos/prioritize-geo-actions"],
  ),
];

function clonePage(
  source: MarketingPage,
  overrides: Partial<MarketingPage> & Pick<MarketingPage, "path">,
): MarketingPage {
  return { ...source, ...overrides };
}

const scrunchStructuredPages: MarketingPage[] = [
  clonePage(
    productPages.find((page) => page.path === "platform/content-delivery")!,
    {
      path: "platform/agent-experience",
      kicker: "Agent Experience Platform · AXP",
      title: "你的网站还没有为 AI 优化。",
      emphasis: "现在可以了。",
      summary:
        "识别到访的 AI Agent，在边缘层交付轻量、结构清晰、事实一致的内容版本，同时保持人类网站体验不变。",
      related: [
        "platform/agent-traffic",
        "platform/site-maps",
        "platform/monitoring/citations",
      ],
    },
  ),
  clonePage(productPages.find((page) => page.path === "platform/site-audit")!, {
    path: "platform/site-maps",
    kicker: "Site Maps",
    title: "从 AI 的视角查看",
    emphasis: "整个网站。",
    summary:
      "可视化 AI Agent 能访问哪些页面、在哪里受阻，以及哪些内容需要重新组织或交付。",
    related: [
      "platform/agent-experience",
      "platform/agent-traffic",
      "how-tos/audit-website",
    ],
  }),
  clonePage(
    productPages.find((page) => page.path === "platform/ai-visibility")!,
    {
      path: "platform/monitoring/citations",
      kicker: "AI Monitoring & Citations",
      title: "成为豆包、千问和 DeepSeek",
      emphasis: "答案里的一部分。",
      summary:
        "追踪品牌在 AI 答案中的回答份额、位置、语境和趋势，并识别真正塑造答案的引用来源。",
      related: [
        "platform/monitoring/insights",
        "platform/ai-search-trends",
        "how-tos/track-citations",
      ],
    },
  ),
  clonePage(productPages.find((page) => page.path === "platform/insights")!, {
    path: "platform/monitoring/insights",
    kicker: "Insights",
    title: "从复杂监测数据中",
    emphasis: "直接找到下一步。",
    summary:
      "发现竞争盲区、内容缺口、引用机会与异常变化，并把每条洞察转成可验证的行动。",
    related: [
      "platform/monitoring/citations",
      "platform/site-maps",
      "platform/agent-experience",
    ],
  }),
  clonePage(
    solutionPages.find((page) => page.path === "solutions/ecommerce")!,
    {
      path: "platform/shopping",
      kind: "product",
      kicker: "AI Shopping",
      title: "在产品层面查看",
      emphasis: "AI 搜索表现。",
      summary:
        "按产品、类目、购买场景和渠道追踪 AI 推荐，理解商品事实、评价与第三方内容如何影响答案。",
      related: [
        "platform/monitoring/citations",
        "platform/ai-search-trends",
        "labs/traffic-conversion",
      ],
    },
  ),
  clonePage(
    productPages.find((page) => page.path === "platform/search-trends")!,
    {
      path: "platform/ai-search-trends",
      kicker: "AI Search Trends",
      title: "看见数百万用户正在向 AI",
      emphasis: "询问什么。",
      related: [
        "platform/monitoring/citations",
        "platform/monitoring/insights",
        "labs/query-behavior",
      ],
    },
  ),
  clonePage(
    solutionPages.find((page) => page.path === "solutions/enterprise")!,
    {
      path: "enterprise",
      kicker: "Enterprise",
      title: "企业级能力，",
      emphasis: "不拖慢行动速度。",
      summary:
        "获得大型团队需要的安全、规模、治理和专属服务，同时保持 GEO 项目快速落地。",
      related: [
        "platform/monitoring/citations",
        "platform/monitoring/citations",
        "pricing",
      ],
    },
  ),
  clonePage(solutionPages.find((page) => page.path === "solutions/agencies")!, {
    path: "agencies",
    kicker: "Agencies",
    title: "代理商选择的",
    emphasis: "AI 搜索平台。",
    summary:
      "赢下更多提案、推出新的 GEO 服务，并在同一个系统里为所有客户持续交付结果。",
    related: ["platform/monitoring/citations", "platform/insights", "pricing"],
  }),
  clonePage(indexPages.find((page) => page.path === "tools")!, {
    path: "aeo-tools",
    kicker: "AEO / GEO Tools",
    title: "从一个免费工具开始",
    summary:
      "品牌快检、提示词生成、AI Agent 可读性评分和抓取检查，帮助团队快速建立第一份基线。",
    related: [
      "tools/brand-audit",
      "tools/prompt-generator",
      "tools/ai-crawler-check",
    ],
  }),
  clonePage(toolPages.find((page) => page.path === "tools/contact")!, {
    path: "brand-audit",
    related: ["aeo-tools", "platform/monitoring/citations", "contact"],
  }),
  clonePage(
    guidePages.find((page) => page.path === "resources/guides/geo-basics")!,
    {
      path: "guides/ai-search-guide",
      kicker: "AI 搜索完整指南",
      title: "从提示词到引用证据的",
      emphasis: "完整监测指南。",
    },
  ),
];

const allMarketingPages: MarketingPage[] = [
  ...scrunchStructuredPages,
  ...productPages,
  ...solutionPages,
  pricingPage,
  ...indexPages,
  ...faqCategoryPages,
  ...howToCategoryPages,
  ...guidePages,
  ...howToPages,
  ...faqPages,
  ...labPages,
  ...casePages,
  ...articlePages,
  ...toolPages,
  ...companyPages,
];

// These routes describe AXP, browser automation, account pools, synthetic trend
// estimates, or free tools that are outside the current official-API product.
// Keeping their source copy here is useful for later product work, but they are
// deliberately excluded from routing, navigation and the public sitemap today.
const retiredMarketingPaths = new Set([
  "platform/agent-experience",
  "platform/agent-traffic",
  "platform/site-maps",
  "platform/site-audit",
  "platform/content-delivery",
  "platform/account-pool",
  "platform/search-trends",
  "platform/ai-search-trends",
  "platform/shopping",
  "tools",
  "aeo-tools",
  "tools/contact",
  "brand-audit",
  "tools/prompt-generator",
  "tools/ai-crawler-check",
  "faqs/account-pool-management",
  "blog/account-pool-operations",
  "how-tos/track-ai-bot-traffic",
  "how-tos/track-ai-search-trends",
  "how-tos/category/ai-traffic-analysis",
  "how-tos/category/site-auditing",
  "how-tos/category/content-delivery",
  "how-tos/category/trend-exploration",
  "labs",
  "case-studies",
  ...labPages.map((page) => page.path),
  ...casePages.map((page) => page.path),
]);

export const marketingPages = allMarketingPages.filter(
  (page) => !retiredMarketingPaths.has(page.path),
);

export const marketingPageMap = new Map(
  marketingPages.map((page) => [page.path, page]),
);

export const navigationGroups = [
  {
    label: "产品",
    groups: [
      {
        label: "监测与洞察",
        paths: [
          "platform/ai-visibility",
          "platform/citations",
          "platform/insights",
          "platform/search-trends",
        ],
      },
      {
        label: "网站与交付",
        paths: [
          "platform/agent-traffic",
          "platform/site-audit",
          "platform/content-delivery",
          "platform/account-pool",
        ],
      },
    ],
  },
  {
    label: "解决方案",
    groups: [
      {
        label: "团队类型",
        paths: [
          "solutions/brands",
          "solutions/agencies",
          "solutions/enterprise",
          "solutions/ecommerce",
        ],
      },
    ],
  },
  {
    label: "资源",
    groups: [
      {
        label: "学习",
        paths: ["resources/guides/geo-basics", "how-tos", "faqs"],
      },
      { label: "研究与证明", paths: ["labs", "case-studies", "blog", "tools"] },
    ],
  },
];

export function pageLabel(path: string): string {
  const page = marketingPageMap.get(path);
  return page
    ? `${page.title}${page.emphasis ?? ""}`
    : (path.split("/").at(-1)?.replaceAll("-", " ") ?? path);
}
