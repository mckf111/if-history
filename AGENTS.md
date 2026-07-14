# 项目规则

- 默认使用简体中文编写玩家可见文本，代码标识符使用英文。
- 游戏规则必须保持为纯函数；React 组件不得直接修改 `SimState`、`GameState` 或 `StoryState`，只提交命令。
- 所有随机结果必须来自存档内的种子状态，禁止使用 `Math.random()`。
- 史实与架空推论必须在事件资料中明确区分，并为史实提供来源。
- 修改游戏状态结构时同步升级存档版本和测试。
- 提交前运行 `npm test` 与 `npm run build`。

## 深入文档

| 文档 | 用途 |
| --- | --- |
| `README.md` | 安装、玩法与项目概览 |
| `docs/ARCHITECTURE.md` | 状态机、随机模型与内容结构 |
| `docs/HISTORICAL-NOTES.md` | 历史边界与资料来源 |
| `docs/DEPLOY-GITEE.md` | Gitee 国内镜像与双端部署 |
