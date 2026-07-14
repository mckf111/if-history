# 第三方运行时软件

当前生产页面随构建产物使用以下运行时依赖；版本来自 `package-lock.json` 与本地安装元数据：

| 软件 | 版本 | 许可证 | 上游 |
| --- | --- | --- | --- |
| React | 19.2.7 | MIT | <https://github.com/facebook/react> |
| React DOM | 19.2.7 | MIT | <https://github.com/facebook/react> |
| Scheduler | 0.27.0 | MIT | <https://github.com/facebook/react> |
| Vite 构建注入的 `modulepreload` 运行时片段 | 8.1.4 | MIT | <https://github.com/vitejs/vite> |

公开构建随附 [`public/THIRD-PARTY-NOTICES.txt`](../public/THIRD-PARTY-NOTICES.txt)，其中保留 React 系列运行时与 Vite 构建注入片段对应的 MIT 许可证正文和版权声明。该第三方许可独立于项目自有代码和内容的专有许可。

其余开发与构建工具的精确版本由 `package-lock.json` 锁定，不作为浏览器运行时功能对外提供。每次正式发行仍需重新运行依赖审计；本表不是对未来版本的永久结论。
