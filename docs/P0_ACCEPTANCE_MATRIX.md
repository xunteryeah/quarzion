# Quarzion P0 验收矩阵

状态含义：`PENDING` 未执行，`PASS` 已有直接证据，`FAIL` 与目标不符。

| 编号 | 验收要求 | 验证方法 | 预期结果 | 当前状态 |
|---|---|---|---|---|
| BASE-01 | 生产变更前存在完整快照 | 校验备份目录、SHA256、源码包、配置和数据库 | 所有文件校验通过 | PASS |
| BASE-02 | 备份可恢复 | 在隔离 Docker 卷恢复两个数据库并执行完整性检查 | 两库均返回 `integrity=ok` | PASS |
| BASE-03 | 回滚配置可加载 | 对备份 Nginx 配置执行 `nginx -t` | 配置检查成功 | PASS |
| AUTH-01 | 客户可以登录和退出 | 浏览器与接口端到端测试 | 登录创建安全会话，退出后会话失效 | PENDING |
| AUTH-02 | 未登录不能访问客户后台 | 匿名请求 `app.quarzion.com` 及客户 API | 跳转登录或返回 401 | PENDING |
| AUTH-03 | 邀请只能使用一次并会过期 | 创建邀请并重复、过期使用 | 首次有效，重复和过期均拒绝 | PENDING |
| AUTH-04 | 会话安全 | 检查 Cookie 与会话表 | HttpOnly、Secure、SameSite，支持撤销 | PENDING |
| TENANT-01 | 客户只能看到所属组织 | 使用两个组织的用户分别请求项目列表 | 只返回本组织项目 | PENDING |
| TENANT-02 | 修改项目 ID 不能越权读取 | A 用户请求 B 组织项目 | 返回 403/404，不泄露数据 | PENDING |
| TENANT-03 | 修改项目 ID 不能越权写入 | A 用户更新、删除或重试 B 项目资源 | 拒绝且产生审计记录 | PENDING |
| TENANT-04 | 只读访客不能修改 | 只读角色调用全部写接口 | 全部拒绝 | PENDING |
| ADMIN-01 | 管理员能创建客户公司 | 管理端创建组织 | 统一数据库出现组织 | PENDING |
| ADMIN-02 | 管理员能创建项目 | 在新组织下创建项目 | 客户授权后可见同一项目 | PENDING |
| ADMIN-03 | 管理员能邀请用户 | 创建并接受邀请 | 用户成为正确组织成员 | PENDING |
| DATA-01 | 前后台使用同一生产数据库 | 对同一组织/项目交叉读写 | 无复制、无双写、即时一致 | PENDING |
| DATA-02 | 生产库不自动写演示数据 | 使用空生产库启动全部服务 | 数据库保持空业务状态 | PENDING |
| DATA-03 | 演示与生产完全隔离 | 对比连接串、数据库和环境配置 | 无共享库、无共享客户记录 | PENDING |
| DATA-04 | 无固定趋势与固定日期 | 新建空项目并查看全部页面 | 真实空状态，无虚构曲线和固定日期 | PENDING |
| PLATFORM-01 | 平台名称统一 | 检查数据库枚举、API 和 UI | 豆包、腾讯元宝、DeepSeek 一致 | PENDING |
| DOMAIN-01 | 官网域名正确 | 请求 `quarzion.com` | HTTP 200、有效 HTTPS | PASS |
| DOMAIN-02 | 客户后台独立域名 | 请求 `app.quarzion.com` | 有效 HTTPS，未登录进入登录页 | PENDING |
| DOMAIN-03 | API 独立域名 | 请求 `api.quarzion.com` | 无管理 UI，按接口鉴权 | PENDING |
| DOMAIN-04 | 管理端独立域名 | 请求 `admin.quarzion.com` | 未授权返回 401 | PASS |
| OPS-01 | 数据库每日自动备份 | 检查定时任务和最近备份 | 备份新鲜且校验通过 | PENDING |
| OPS-02 | 数据库可恢复 | 在非生产环境执行恢复演练 | 数据、结构和权限验证通过 | PENDING |
| OPS-03 | 访问和错误可追踪 | 触发正常请求与测试错误 | 结构化日志包含请求 ID，无敏感值 | PENDING |
| OPS-04 | 异常会通知 | 触发测试告警 | 指定通知渠道收到告警 | PENDING |
| OPS-05 | 接口有限流 | 对登录、联系表单和 API 施加突发请求 | 超限返回 429，正常客户不受影响 | PENDING |
| CONTACT-01 | 联系表单真实送达 | 提交唯一测试线索 | 邮箱或 CRM 收到同一条线索 | PENDING |
| CONTACT-02 | 联系表单防垃圾 | 缺字段、蜜罐和突发请求测试 | 非法提交拒绝并限流 | PENDING |
| RELEASE-01 | 桌面和移动端关键流程可用 | 端到端回归 | 登录、项目、提示词和退出均通过 | PENDING |
| RELEASE-02 | 整站可回滚 | 使用发布前快照执行非生产回滚 | 服务和数据库恢复到目标版本 | PENDING |

P0 只有在所有 `PENDING` 项具有直接证据并转为 `PASS` 后才可宣布完成。
