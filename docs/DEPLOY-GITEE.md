# Gitee 国内镜像部署

推送到 `main` 后，GitHub Actions 会：

1. 测试并构建 `dist`
2. 部署到 GitHub Pages（国际）
3. 把 `dist` 强制推到 Gitee 仓库的 `gh-pages` 分支，并尝试触发 Pages 重建（国内）

权威规范网址仍是 GitHub Pages：`https://mckf111.github.io/if-history/`。  
Gitee 只做大陆可访问镜像，不改 SEO 规范网址。

## 一次性配置（约 10 分钟）

### 1. 注册 / 登录 Gitee

打开 [https://gitee.com](https://gitee.com)，完成实名（免费 Pages 通常要求）。

### 2. 新建公开仓库

- 当前镜像仓库：`caowenhu/if-history`
- 公开仓库
- 可不放源码；流水线只推构建产物到 `gh-pages`

若用户名或仓库名变更，在 GitHub 仓库设置 **Variables**：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `GITEE_OWNER` | `caowenhu` | Gitee 用户名 |
| `GITEE_REPO` | `if-history` | Gitee 仓库名 |
| `GITEE_PAGES_BRANCH` | `gh-pages` | Pages 部署分支 |

### 3. 创建私人令牌

Gitee → 设置 → 安全设置 → 私人令牌 → 生成新令牌。

至少勾选：

- `projects`（推送仓库）
- `pages`（触发静态页重建；若列表无此项，先保证 `projects` 与仓库写权限）

### 4. 写入 GitHub Secret

GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Secret | 值 |
| --- | --- |
| `GITEE_TOKEN` | 上一步的私人令牌 |

命令行（需已 `gh auth login`）：

```powershell
gh secret set GITEE_TOKEN --body "你的令牌"
```

### 5. 首次开通 Gitee Pages

1. 先随便推一次 `main`，或在 Actions 里 **Run workflow**，让 `gh-pages` 分支出现  
2. 打开 Gitee 仓库 → **服务** → **Gitee Pages**  
3. 部署分支选 `gh-pages`，目录选 `/`（根目录）  
4. 启动 / 更新  

成功后地址一般为：

`https://caowenhu.gitee.io/if-history/`

### 6. 验证

- GitHub Actions 中 `deploy` 与 `deploy-gitee` 均为绿色  
- 国内网络不翻墙打开 Gitee 链接可进游戏  
- 国际链接 GitHub Pages 仍可用  

## 常见问题

**`deploy-gitee` 跳过了**  
未配置 `GITEE_TOKEN`。按上面第 4 步添加 Secret。

**分支已推送，但站点仍是旧版**  
免费 Pages 有时不会自动重建。流水线会调重建 API；若仍失败，到 Gitee Pages 页点一次「更新」。

**401 / 403**  
令牌过期、权限不足，或仓库路径与 `GITEE_OWNER` / `GITEE_REPO` 不一致。

**404**  
Pages 未开通，或仓库名/用户名与 URL 不一致。

## 安全

- 令牌只放在 GitHub Actions secrets，不要写进仓库  
- 流水线用 `oauth2:<token>` 仅用于临时 `git push`，日志里勿 `echo` 令牌  
- 令牌泄露后立刻在 Gitee 作废并轮换  
