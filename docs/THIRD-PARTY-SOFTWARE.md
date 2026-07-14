# 第三方运行时软件

当前生产页面随构建产物使用以下运行时依赖；版本来自 `package-lock.json` 与本地安装元数据：

| 软件 | 版本 | 许可证 | 上游 |
| --- | --- | --- | --- |
| React | 19.2.7 | MIT | <https://github.com/facebook/react> |
| React DOM | 19.2.7 | MIT | <https://github.com/facebook/react> |
| Scheduler | 0.27.0 | MIT | <https://github.com/facebook/react> |

开发与构建工具的精确版本由 `package-lock.json` 锁定，不作为浏览器运行时功能对外提供。每次正式发行仍需重新运行依赖审计；本表不是对未来版本的永久结论。
