# EdgeOne Makers 国内访问入口

EdgeOne Pages 已升级为 EdgeOne Makers；本文沿用仓库中的 `deploy-edgeone` 任务名和旧版 CLI 命令，以便与现有工作流对应。

## 当前生产状态

截至 2026-07-15，当前正式入口已经上线，不再处于“等待首次部署”阶段：

- 权威规范网址：`https://if-history.caowenhu.com/`
- EdgeOne Makers 中国站项目：`if-history`
- 加速区域：全球可用区（含中国大陆）
- 自定义域名 CNAME：`if-history.caowenhu.com.pages.dnsoe5.com`
- 备案展示：苏ICP备2024089758号-1
- HTTPS：免费 RSA 证书已部署并自动续期；HTTP 以 302 跳转到 HTTPS
- 当前发布方式：本地完成检查与构建后，只把构建产物 `dist` 上传给 EdgeOne
- 发布回退：GitHub Pages 保留，但不作为页面元数据、分享摘要或站点地图中的官方地址

私有 GitHub 仓库不会因为部署而公开。EdgeOne 得到的是浏览器本来就需要下载的 HTML、JavaScript、CSS 和公开资源，不是 Git 历史、测试或项目文档；但这些前端产物仍能被访问者查看，不能把“仓库私有”理解成“网页代码不可见”。

## 后续版本发布

### 1. 本地验收并生成产物

```powershell
npm ci
npm test
npm run audit:public
npm run build
```

只上传新生成的 `dist`。不要上传项目根目录、`.git`、源码、测试、`.env` 或令牌。

### 2. 在中国站创建生产部署

打开 [EdgeOne Makers 控制台](https://console.cloud.tencent.com/edgeone/pages)，进入项目 `if-history`，在构建部署页面新建部署，选择**生产环境**并上传 `dist` 内的文件。先确认预览正确，再让生产环境指向这次成功部署。

官方当前同时支持连接 Git 仓库和直接上传；本项目采用直接上传，是为了只交付静态构建产物，不把私有源码仓库接入托管平台。操作入口见 [通过 Makers 快速部署网站](https://cloud.tencent.com/document/product/1552/119338)。

### 3. 验证正式域名

每次发布至少确认：

- `http://if-history.caowenhu.com/` 返回跳转，目标是 HTTPS
- `https://if-history.caowenhu.com/` 返回 200，首页能进入游戏且静态资源没有 404
- 页面规范网址、分享网址和站点地图都使用 `https://if-history.caowenhu.com/`
- 页脚显示苏ICP备2024089758号-1，并链接到工信部备案系统
- `/rights.txt` 显示 v0.6.0 起保留所有权利
- `/THIRD-PARTY-NOTICES.txt` 保留 React、Scheduler 与 Vite 的 MIT 声明
- 生产 HTML 和构建产物不包含私有 GitHub 仓库地址或秘密
- 用中国大陆真实网络检查首屏、刷新和资源加载；控制台部署成功不等于每条实际网络都一定更快

## 可选的 GitHub Actions 自动发布

`.github/workflows/deploy.yml` 仍保留自动路线：GitHub Actions 先审计、测试、构建并部署 GitHub Pages；只有仓库配置了 `EDGEONE_API_TOKEN` 时，`deploy-edgeone` 才会执行以下命令，否则安全跳过：

```text
npx --yes edgeone@1.6.13 pages deploy ./dist -n if-history -t "$EDGEONE_API_TOKEN"
```

EdgeOne 官方说明旧 Pages CLI 命令目前仍处于兼容期。启用自动路线前，必须先用短期令牌确认它部署到同一个中国站项目和生产环境；令牌只放 GitHub Actions Secret，不粘贴到聊天、Issue、日志或仓库文件。验证无误后再决定是否改用长期轮换令牌。

## 域名、证书与费用边界

- 不要随意修改现有 CNAME；只有 EdgeOne 控制台明确给出新目标时才变更 DNS。
- 全球可用区（含中国大陆）的自定义域名需要完成工信部备案；本项目当前域名已经展示备案号。官方步骤见 [自定义域名](https://cloud.tencent.com/document/product/1552/127404)。
- 免费证书有效期与续期由平台管理；仍应定期检查 HTTPS 是否可用。官方说明见 [申请免费证书](https://cloud.tencent.com/document/product/1552/127407)。
- EdgeOne Makers 当前提供免费版，但仍处于限时免费阶段，配额和商业化规则可能调整；长期使用前复核[限制与配额](https://cloud.tencent.com/document/product/1552/132789)。
- EdgeOne 能改善国内访问链路，但不能保证所有地区、运营商和时段都同样快；最终以真实网络测试为准。
