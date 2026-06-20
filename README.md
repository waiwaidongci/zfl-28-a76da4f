# 高山驿站补给调度

直接打开 `index.html` 即可游玩（需 HTTP 服务器），或执行 `npm run build` 生成单文件 `dist/index.html` 后双击打开。每天给两名向导分配路线，管理柴火、药品、干粮和疲劳，撑过目标天数完成剧本。

## 快速开始

```bash
# 安装依赖（仅首次）
npm install

# 开发模式 —— 启动本地服务器，访问 http://localhost:3000
npm run dev

# 构建 —— 生成 dist/index.html（单文件，可直接打开）
npm run build

# 测试 —— 先构建再运行 Node.js 单元测试
npm test

# 仅运行测试（跳过构建，需先手动 npm run build）
npm run test:quick

# 代码格式检查
npm run lint

# 自动修复格式问题
npm run lint:fix

# 预览构建产物
npm run serve:dist
```

## 项目结构

```
├── index.html              # 开发入口（ES 模块，需 HTTP 服务器）
├── css/style.css           # 样式
├── src/
│   ├── index.js            # JS 入口（import app.js → init）
│   ├── app.js              # 主逻辑：游戏引擎、UI 渲染、事件处理
│   ├── game-logic-index.js # 测试用的数据/逻辑聚合导出
│   ├── data/               # 游戏数据（纯数据，无副作用）
│   │   ├── routes.js       #   路线定义
│   │   ├── difficulty.js   #   难度配置
│   │   ├── events.js       #   事件池
│   │   ├── scenarios.js    #   剧本定义
│   │   ├── achievements.js #   成就定义
│   │   └── traits.js       #   向导特质定义
│   ├── logic/              # 核心逻辑（纯函数，无 DOM 依赖）
│   │   ├── rng.js          #   确定性随机数生成
│   │   ├── storage.js      #   localStorage 工具类
│   │   ├── settings.js     #   设置读写与应用
│   │   ├── challenge.js    #   挑战码编解码
│   │   ├── validate.js     #   剧本配置校验
│   │   ├── custom-scenarios.js # 自定义剧本存储
│   │   ├── career.js       #   向导生涯与特质
│   │   └── achievements.js #   成就解锁检查
│   └── storage/            # 存档逻辑
│       ├── archive.js      #   结算档案读写与迁移
│       └── tutorial.js     #   新手引导状态读写
├── tests/
│   └── regression.html     # 浏览器回归验证页面
├── build.js                # esbuild 构建脚本
├── run-tests.js            # Node.js 单元测试运行器
├── game-logic.js           # （旧版独立逻辑文件，已被 dist/game-logic.js 替代）
├── tests.html              # 浏览器端测试页面
├── .eslintrc.json          # ESLint 配置
├── package.json            # 项目配置与脚本
└── dist/                   # 构建输出（不提交到 Git）
    ├── index.html          #   单文件可部署版本
    └── game-logic.js       #   CJS 格式测试用逻辑包
```

## 启动与开发

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动本地服务器（端口 3000），加载 ES 模块开发版 |
| `npm run build` | 构建 `dist/index.html`（单文件）和 `dist/game-logic.js`（CJS 测试包） |
| `npm run serve:dist` | 预览构建产物（端口 3001） |

## 测试

| 命令 | 说明 |
|------|------|
| `npm test` | 构建 + 运行 Node.js 单元测试（88 条用例） |
| `npm run test:quick` | 仅运行测试（需先手动构建） |
| 浏览器打开 `tests.html` | 在浏览器环境中运行测试 |
| 浏览器打开 `tests/regression.html` | 浏览器回归验证（需本地服务器） |

Node.js 测试覆盖：挑战码编解码、剧本配置校验、自定义剧本存储等核心逻辑。浏览器测试通过 iframe 加载完整游戏并验证运行时行为。

## 代码格式检查

| 命令 | 说明 |
|------|------|
| `npm run lint` | 检查 `src/` 下所有 JS 文件 |
| `npm run lint:fix` | 自动修复可修复的问题（如 `var` → `const`） |

## 构建

```bash
npm run build
```

构建产物：
- `dist/index.html` — 单文件，内联 CSS + JS（IIFE 格式），可直接双击打开或部署到任意静态服务器
- `dist/game-logic.js` — CommonJS 格式，供 `run-tests.js` 使用

### GitHub Pages 部署

1. 执行 `npm run build`
2. 将 `dist/` 目录内容推送到 GitHub Pages 分支
3. 或将仓库根目录设为 GitHub Pages 源，并在构建后将 `dist/index.html` 复制到根目录

> **提示**：开发版 `index.html` 使用 ES 模块（`<script type="module">`），需要 HTTP 服务器才能运行；构建版 `dist/index.html` 是纯内联的单文件，支持 `file://` 协议直接打开。

## 本地数据说明

游戏所有数据均存储在浏览器 `localStorage` 中，共有以下六类数据键：

| 键名 | 内容 | 容量说明 |
|------|------|----------|
| `mountain_post_settings` | 玩家的玩法设置偏好 | 占用极小（约 100 字节） |
| `mountain_post_tutorial_completed` | 新手引导是否已完成或跳过 | 占用极小 |
| `mountain_post_archives` | 结算档案记录 | 最多自动保留最近 100 条 |
| `mountain_post_achievements` | 各剧本已解锁的成就 ID 列表 | 占用极小 |
| `mountain_post_career` | 向导生涯数据与特质解锁进度 | 占用较小（约 1-2 KB） |
| `mountain_post_custom_scenarios` | 自定义剧本数据 | 视剧本数量而定 |

> **兼容性承诺**：所有 localStorage 键名在工程化改造前后保持不变，旧版本存档数据可被新版正常读取。档案数据包含版本号字段，加载时会自动迁移补全新增字段。

### 本地数据清理方式

**方式一：通过浏览器开发者工具（推荐）**
1. 打开页面后按 `F12`（Mac 为 `Cmd + Option + I`）调出开发者工具
2. 切换到 **Application**（应用）标签页
3. 左侧导航栏展开 **Local Storage** → 选择当前页面域名
4. 找到对应键名，右键 → **Delete** 删除即可
   - 删除 `mountain_post_settings` 仅清除玩法设置
   - 删除 `mountain_post_tutorial_completed` 重置新手引导状态
   - 删除 `mountain_post_archives` 清空所有档案记录
   - 删除 `mountain_post_achievements` 重置所有成就进度
   - 删除 `mountain_post_career` 重置所有向导生涯数据与特质
   - 删除 `mountain_post_custom_scenarios` 清空自定义剧本

**方式二：通过控制台命令**
在开发者工具的 **Console**（控制台）标签页中执行：
```javascript
localStorage.removeItem('mountain_post_settings')
localStorage.removeItem('mountain_post_tutorial_completed')
localStorage.removeItem('mountain_post_archives')
localStorage.removeItem('mountain_post_achievements')
localStorage.removeItem('mountain_post_career')
localStorage.removeItem('mountain_post_custom_scenarios')
localStorage.clear()  // 一键清空该域名下所有本地存储
```
执行命令后刷新页面即可生效。

## 第一次游玩推荐流程

1. 首次打开页面时先阅读新手引导，了解剧本选择、路线派遣、资源消耗、事件选择和结算复盘的位置；若已经熟悉玩法，可点击「跳过引导」，之后也能从顶部「游戏帮助」重新打开。
2. 在「赛季剧本与难度设置」中选择「标准雪线」和稳妥难度，点击「开始剧本」进入第一局。
3. 查看左上角资源面板和中间「今日路线」，给两名向导分别选择不同路线；前几天优先选择风险较低、消耗可承受的路线，也可以让疲劳高的向导留守休整。
4. 每天开始若触发随机事件，先对照选项上的资源变化标签，再根据当前最紧缺的资源做决定。
5. 胜利或失败后打开「调度复盘」查看每天的资源变化、路线结果、事件选择和预估对比，再根据复盘调整下一局的派遣策略。

## 玩法设置

顶部标题栏右侧的「玩法设置」按钮可打开个人偏好面板，所有设置均保存在浏览器本地，刷新页面后仍然生效，且不影响当前局的剧本、难度、档案和成就数据。

| 设置项 | 作用 |
|--------|------|
| **紧凑日志** | 缩小事件日志区域的行高与字号，在有限屏幕空间内展示更多条日志记录。适合屏幕较小或希望一次看到更多历史信息的玩家。 |
| **自动打开复盘** | 游戏结束（胜利/失败）后自动弹出调度复盘面板，无需手动点击「调度复盘」按钮。适合每局结束后都想回顾决策过程的玩家。 |
| **隐藏已解锁成就提示** | 结算界面不再对新解锁的成就显示「新达成!」高亮提示，保持界面简洁。适合反复刷剧本、不希望被成就提示打扰的玩家。 |
| **降低动画反馈** | 禁用卡片悬浮位移、进度条过渡、事件选项动效等 CSS 动画效果，减少视觉干扰。适合低配设备、追求操作速度或对动态效果敏感的玩家。 |
| **关闭生涯加成** | 禁用向导生涯特质带来的所有加成和减益效果。仅影响游戏数值，生涯记录和特质解锁仍会正常累积。适合追求纯剧本挑战的玩家。 |

所有设置项均为开关切换，可随时调整。设置面板底部提供「恢复默认」按钮，一键将所有偏好重置为初始状态。

## 向导生涯与特质成长

两名向导（阿措和洛桑）会随着游戏进程逐步积累经验，解锁永久特质。特质会影响风险预估、实际结算、每日简报、路线图鉴和调度复盘。

### 特质列表

| 特质名称 | 图标 | 类型 | 效果 | 解锁条件 |
|----------|------|------|------|----------|
| **草药通** | 🌿 | 正面 | 草药小径成功率 +10%，药品消耗 -50% | 累计走草药小径 12 次 |
| **暴雪行者** | ❄️ | 正面 | 暴雪天气下疲劳增长 -25% | 累计经历 8 天暴雪 |
| **养精蓄锐** | 💤 | 正面 | 连续留守 2 天后，每日额外恢复 1 点疲劳 | 最长连续留守达到 3 天 |
| **回复神速** | ⚡ | 正面 | 每次留守额外多恢复 1 点疲劳 | 累计留守 15 天 |
| **老马识途** | 🦌 | 正面 | 走过 20 次以上的路线风险 -1 | 单一路线累计走 20 次 |
| **福星高照** | 🍀 | 正面 | 所有商队路线基础成功率 +5% | 累计成功接应 25 次 |
| **受挫消沉** | 😔 | 负面 | 救援失败后 2 天内成功率 -15% | 累计救援失败 5 次 |

### 生涯数据的影响

- **次日风险预估**：特质带来的成功率、疲劳、消耗等变化会反映在预估面板中
- **实际结算**：特质效果在每日结算时真实生效
- **每日简报**：显示当前每名向导已解锁的特质
- **路线图鉴**：展示每名向导的生涯统计和所有特质一览
- **调度复盘**：在向导状态卡片中显示已解锁的特质

> 提示：旧档案和成就数据不会因生涯系统而失效，生涯数据独立存储。可在玩法设置中随时关闭生涯加成，回归纯数值挑战。
