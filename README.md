# 如果历史：刻下无名 —— 城破前夜

> **What If History: The Nameless Engraver** — a belief-propagation roguelike set in Beijing, three days before the city falls (1644). You are a woodblock engraver with no army and no title — only a carving knife. Forge documents, change what people *believe*, and watch history bend… or snap back. Every run ends with a chronicle you carved yourself.

**[▶ 在线游玩 / Play in browser](https://mckf111.github.io/if-history/)** ·
[![Code: AGPL-3.0](https://img.shields.io/badge/code-AGPL--3.0-8b2c24)](LICENSE)
[![Content: CC BY-NC-SA 4.0](https://img.shields.io/badge/content-CC%20BY--NC--SA%204.0-304b43)](LICENSE-CONTENT.md)

一款模拟驱动的历史实验游戏。崇祯十七年三月十六，北京城破前三天。你是姚小满，宣武门外一间刻字铺的代工：没有兵，没有官身，只有一把刻刀、十二个时辰的白天，和一城各怀心事的人。

**城破挡不住——这是历史的惯性。** 但门由谁开、匠籍名册落谁手、弟弟能不能上船，取决于这三天里谁相信了什么。文书能改变相信，相信能改变人做的事，人做的事撬动历史的节点。一局一个实验（20–40 分钟）；一局一部你亲手刻出来的编年史。

**What makes it different:** history has *inertia*. Each pivot is held up by pillars anchored in named characters' beliefs; a single clever forgery gets absorbed by the current of events. NPCs check documents less carefully when they *want* to believe them; couriers have private agendas (they sell, embellish, or pocket your letters); every die roll is revealed at the end, and even getting executed produces a chronicle. Pure front-end (React + TypeScript), no server, no AI at runtime — same seed, same choices, same history.

## 怎么玩

每局三个游戏日（三月十六至十八）+ 三月十九节点日结算，约 20–40 分钟：

1. **白天四个时辰**：走动（免费）、观察现场物件、探问人物底细、采买或窃取部件、在刻坊伪造/添改/焚毁文书、托人送信（免费）、避风头。
2. **夜里**：文书沿关系网流动——带信人有自己的私心（转卖、加戏、昧下）；收信人验看（想信的人查得松）；信念过阈的人会自己行动；流言衰减一跳。
3. **晨起读报**：你只听得见街面的动静，听不见人心。要知道谁信了什么，去探、去看他做了什么。
4. **三月十九破晓**：九根支撑柱清账，三处撬点各掷一次种子骰（胜算=10+倒柱权重，骰值全部公开），落入结果族，生成三层编年史——事实层（发生了什么）、记载层（什么被写下）、流传层（百年后怎么说）。

被缉拿处决也会生成编年史——失败也是历史的一种写法。跨局的「史鉴」收藏你验证过的因果连线、收集的结局与补全的人物档案。

核心法则：**历史不会被一个神奇错字拯救，但会被一群相信了错字的人推着走。** 单发小聪明会被历史修正力吸收；要掰动一个撬点，得在三天里削掉它的多根柱子。

## 运行与验证

需要 Node.js 20.19–20.x，或 Node.js 22.12 及更高版本。

```powershell
npm install
npm run dev
```

浏览器通常会打开 `http://localhost:5173`。生产验证命令：

```powershell
npm test
npm run build
npm run preview
```

游戏是纯前端应用，没有运行时大模型、联网接口、账号或付费功能。人物、断言、撬点与编年史模板均为随构建发布的本地内容，存档只保存在当前浏览器中。

## 当前实现

```text
src/
├── main.tsx                 # 应用入口（当前指向 sim/）
├── sim/                     # 模拟引擎《城破前夜》（当前版本）
│   ├── SimApp.tsx           # 门面：屏幕状态机 + 命令下发
│   ├── types.ts             # SimState 与全部内容接口
│   ├── engine/              # 纯函数引擎：行动/伪造/信念/传播/嫌疑/节点/编年史/因果账/校验
│   ├── content/             # 内容表：人物/断言/地点/文书型制/自主行动/支撑柱/编年史模板/史料
│   ├── ui/                  # 界面：城图/现场/工作台/人物册/夜话/终局/史鉴
│   ├── storage.ts           # v4 单局存档（重放防篡改）+ 史鉴 codex
│   └── *.test.ts            # 确定性/传播不变量/结果族可达/防篡改/200 种子 fuzz
├── story/                   # 旧版三回合互动小说《刻下无名》（归档，无入口）
└── game/                    # 更早的十二回合策略引擎《煤山未尽》（归档，无入口）
```

存档键：`what-if-history.sim.v4`（单局）与 `what-if-history.codex.v1`（跨局史鉴）。旧版 `story.v3` 与 `autosave.v2` 存档原地保留，互不迁移。

实现细节见 [架构说明](docs/ARCHITECTURE.md)，史实与架空的分界见 [史实边界与资料](docs/HISTORICAL-NOTES.md)。

## 授权

双轨授权（详见 [LICENSE-CONTENT.md](LICENSE-CONTENT.md)）：

- **代码**：[AGPL-3.0-only](LICENSE) —— 复制、修改、分发（含网络服务）必须以同协议开源完整源码；
- **叙事内容**（人物、剧情、编年史等全部玩家可见文本）：[CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt) —— 署名、非商业、相同方式共享。

版权人保留双重授权（含商业授权）的一切权利。Copyright (c) 2026 mckf111（文虎）。

## 设计支柱

1. **可实验的历史**：节点有惯性，柱子挂在具名人物的信念上；实验、失败、复盘、再来，玩家的成长是认知的成长。
2. **有脸的因果**：一切传播经过具名人物——欲望决定他想信什么（查得松），恐惧决定他夜里做什么。人物刻画是承重墙，不是文案。
3. **刻刀的手感**：验看、采件、伪造、投放、管理嫌疑；文书不是魔法，要过带信人的私心和验看人的眼睛。
4. **历史与架空分开写**：史实提供时代约束并给来源；虚构人物与推演后果一律标注「架空推演」，绝不伪造史源。
