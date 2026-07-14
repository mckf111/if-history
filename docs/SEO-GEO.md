# SEO / GEO 公开发布说明

这里的 SEO 指搜索引擎优化，GEO 指生成式引擎优化。两者都不以堆关键词或制造虚假权威为目标，而是让机器能读到与玩家实际体验一致、可核对、可引用的内容。

## 第一性原则

1. **先有可见事实，再写元数据。** 首页静态正文直接回答“这是什么、怎么玩、历史与架空如何区分、是否收费与联网”，标题和摘要只压缩这些内容。
2. **实体关系要明确。** JSON-LD 把作品同时标为 `VideoGame` 与 `WebApplication`，给出作者、语言、类型、免费价格、运行环境和唯一网址；没有真实聚合评分，所以不写 `aggregateRating`。
3. **可引用比关键词密度重要。** 史实陈述链接到底本，架空内容明写边界；结局页保留每条史实来源，生成式搜索可以引用具体主张，而不是只能复述营销口号。
4. **搜索发现与训练授权分开。** `OAI-SearchBot` 和用户主动访问被允许，`GPTBot` 被拒绝。robots 只是守约抓取方的行为声明，著作权与许可证仍由授权文件决定。
5. **一个权威网址。** 规范网址、开放图谱网址、站点地图和结构化数据统一为 `https://if-history.caowenhu.com/`。

## 当前实现

- `index.html`：中文标题与摘要、规范网址、开放图谱与 Twitter 分享卡、静态可见正文、结构化数据。
- `public/og-cover.png`：仓库内 SVG 原稿导出的 1200×630 原创分享图，无第三方素材。
- `public/robots.txt`：通用搜索、OpenAI 搜索、用户主动访问与模型训练分开声明。
- `public/sitemap.xml`：当前单页产品的唯一规范网址。
- `public/rights.txt`：版权、双轨授权、原创范围和抓取意愿的机器可读纯文本入口。
- `npm run audit:public`：阻止标题、网址、结构化数据、抓取边界、商务入口、代码/内容/商标边界和分享图在后续修改中彼此漂移。

## 权威依据

- [Google 搜索：控制搜索结果摘要](https://developers.google.com/search/docs/appearance/snippet)：摘要主要来自页面正文，描述元数据应准确概括页面，不应堆砌关键词。
- [Google 搜索：软件应用结构化数据](https://developers.google.com/search/docs/appearance/structured-data/software-app)：软件应用应提供名称、价格等真实属性；评分只有在确有评分数据时才可提供。
- [Schema.org：VideoGame](https://schema.org/VideoGame)：电子游戏实体可以与 Web 应用类型共同描述，并使用游戏类型、运行环境和语言等属性。
- [OpenAI：面向出版者与开发者的常见问题](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)：`OAI-SearchBot` 用于搜索发现，`GPTBot` 用于模型训练，两者可分别设置。

## 发布前检查

```powershell
npm test
npm run build
npm run audit:public
```

此外要人工检查 1440×900 与 390×844 两种视口、键盘焦点、无动画偏好，以及分享图中文字是否在常见裁切范围内。线上发布后再用搜索引擎站长工具提交站点地图；仓库内不保存任何站长平台验证码。
