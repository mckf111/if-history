# EdgeOne Pages 国内访问入口

本项目保留 GitHub Pages 作为权威规范网址，同时用 EdgeOne Pages 增加一个面向中国大陆访问的入口。两端发布同一份静态构建产物：

1. 私有 GitHub 仓库触发 GitHub Actions
2. 流水线运行公开内容审计、测试与构建
3. `dist` 部署到 GitHub Pages
4. 配置了 `EDGEONE_API_TOKEN` 时，只把构建产物 `dist` 上传给 EdgeOne

这条链路不会把私有源码仓库交给 EdgeOne。EdgeOne 得到的是浏览器本来就需要下载的 HTML、JavaScript、CSS 和公开资源；这些产物仍应视为可被访问者查看，不能把“源码仓库私有”等同于“网页代码不可见”。

普通 Gitee Pages 已下线，因此 Gitee 仓库可以继续作为私有备份，但不再承担网页发布。官方状态见 [Gitee Pages 帮助页](https://gitee.com/help/categories/56)。

## 一次性配置

### 1. 登录 EdgeOne Pages

打开 [EdgeOne Pages](https://pages.edgeone.ai/)，注册或登录账号。中国站与国际站账号体系分开；本项目以改善中国大陆访问为目标，应在中国站完成后续配置。

### 2. 创建短期 API Token

按 [官方 API Token 文档](https://pages.edgeone.ai/document/api-token) 在控制台创建令牌。第一次联调建议只给 **1 天有效期**；链路验证稳定后，再按实际维护周期轮换。

令牌属于敏感凭据：不要粘贴到聊天、Issue、提交记录或任何仓库文件中。

### 3. 写入 GitHub Actions Secret

进入私有 GitHub 仓库：

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

填写：

| 名称 | 值 |
| --- | --- |
| `EDGEONE_API_TOKEN` | 上一步创建的 EdgeOne API Token |

### 4. 触发首次部署

工作流提交到 `main` 后，打开 GitHub 仓库的 `Actions`，选择 **Test and deploy static sites**，点击 **Run workflow**。

流水线固定执行官方 CLI 的明确版本：

```text
npx --yes edgeone@1.6.13 pages deploy ./dist -n if-history -t "$EDGEONE_API_TOKEN"
```

未配置 Secret 时，`deploy-edgeone` 会给出警告并安全跳过，不影响 GitHub Pages。官方 GitHub Actions 用法见 [EdgeOne Pages 文档](https://pages.edgeone.ai/document/use-github-actions)。

## 首次上线后的验证

EdgeOne 首次部署成功后会返回实际站点地址。拿到地址后再把它加入 README，不能预先写一个未经验证的入口。

至少逐项确认：

- GitHub Actions 的 `build`、`deploy` 和 `deploy-edgeone` 均成功
- EdgeOne 首页能正常进入游戏，静态资源没有 404
- `/rights.txt` 可访问，并显示 v0.6.0 起保留所有权利
- `/THIRD-PARTY-NOTICES.txt` 可访问，并保留 React、Scheduler 与 Vite 的 MIT 声明
- 页面和构建脚本没有暴露私有 GitHub 仓库地址
- 用中国大陆的真实网络分别测试首屏打开、刷新和资源加载；不能只凭控制台显示“成功”就断言访问已经变快

## 安全与费用边界

- GitHub 仓库继续保持私有，EdgeOne 只接收 `dist`
- API Token 只放 GitHub Actions Secret，并设置到期时间；泄露后立即撤销和轮换
- CLI 锁定为 `edgeone@1.6.13`，升级前重新核对官方文档和包来源
- 不在日志中输出 Token，也不把 Token 写进构建产物
- EdgeOne 当前免费额度和产品规则可能调整，长期使用前应复核[官方免费版说明](https://cloud.tencent.com/document/product/1552/127458)
- 是否命中中国大陆节点、是否需要备案或自定义域名，取决于实际账号、站点与平台策略；在控制台给出明确信息前不作承诺
