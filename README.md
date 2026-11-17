# PokéRogue 宝可梦肉鸽 · 电脑离线版（Windows / Mac）

把官方开源游戏 [PokéRogue](https://github.com/pagefaultgames/pokerogue) 打包成电脑上双击就能玩的离线版。不用联网，不用登录，存档保存在自己电脑上。

手机版（安卓 / iOS）在另一个仓库：[pokerogue-ios-android](https://github.com/1596941391qq/pokerogue-ios-android)。三个平台的游戏内容完全一样，都来自同一份官方构建。

## 下载

去 [Releases](https://github.com/1596941391qq/pokerogue-desktop/releases) 下载最新版：

| 文件 | 适合谁 |
|---|---|
| `prsYYMMDD-portable.exe` | Windows 玩家，双击就能玩。每次启动要先解压，慢一点 |
| `prsYYMMDD-pc.zip` | Windows 玩家，电脑性能一般的推荐用这个。解压后双击「启动游戏.exe」 |
| `prsYYMMDD-mac-arm64.dmg` | M 芯片的 Mac（M1 及以后） |

GitHub 下载慢或打不开的话，用**夸克网盘**（国内下载快）：<https://pan.quark.cn/s/365049b0755c>。里面放 Windows 压缩包（`pc.zip`）和安卓 APK，Mac 版只在 GitHub。

下载永远免费。愿意支持的话可以去**爱发电**自愿赞助：<https://afdian.com/a/pokerogues>

### 老玩家升级

直接下新版用就行，**存档会自动接上**：
- 用过上一版（1.12.0）电脑版的：存档位置一样，打开就是原来的进度。
- 用过 2024 年那批老电脑版的：第一次打开新版时，会自动把旧存档搬过来，旧存档原样保留、不删。

存档放在：
- Windows：`%APPDATA%\pokemon-rogue-battle`
- Mac：`~/Library/Application Support/pokemon-rogue-battle`

升级前建议先在游戏里「管理数据 → 导出数据」备份一份。

### Mac 打不开？

这个版本没有付费的苹果开发者签名，第一次打开会提示「无法验证开发者」：在「访达 → 应用程序」里**右键点 PokeRogue → 打开**，再点「打开」。如果提示「已损坏」，在终端运行：

```bash
xattr -cr /Applications/PokeRogue.app
```

## 合作模式（双人）

两个人一起打一局：你在电脑上当 1P，队友用手机浏览器当 2P（不用装任何东西），每人各带自己的宝可梦打双打。

1. 在**标题画面**点菜单「合作模式 → 开房间（我当 1P）」，会弹出一个小窗，上面有房间号、加入链接和二维码。
2. 队友用手机扫二维码，或打开你复制给他的链接。小窗显示「队友已连接」就可以开始。
3. 选「新游戏」开一局。合作规则只对开房间之后新开的一局生效：每场都是双打、两人各有 10 点选初始宝可梦、过关奖励 5 选 2（每人挑一个）。
4. 不玩了点「合作模式 → 关闭房间」。游戏会回到标题画面，当前这场战斗里还没存档的进度会丢。

说明：

- 游戏跑在你的电脑上，队友看到的是实时画面，所以开着房间时别关游戏窗口；切到别的窗口没关系，画面不会停。
- 两边都要能上网。队友掉线后重新打开链接就能接着玩。
- **局域网房间**：两个人在同一个 Wi-Fi / 路由器下时，点「合作模式 → 开局域网房间（同一个 Wi-Fi，不用外网）」。这时队友打开的页面和连接都由你这台电脑自己提供，不经过外网，断网也能玩。队友用手机或另一台电脑的浏览器扫码 / 打开链接就行。第一次开时 Windows 会弹防火墙提示，请点「允许」；电脑有多个网络地址时，小窗下面可以换一个地址再试。
- 不开房间时，游戏和单人版完全一样。

开发者：`scripts/patch-coop.mjs` 给 `dist/` 里的游戏打四处小补丁（`fetch-game` 结尾会自动跑，可重复跑）；`scripts/sync-coop.sh` 把合作脚本和 2P 页面拷进 `coop/`；局域网房间的服务在 `coop-lan.mjs`。


## 进阶（ascension）

这个分支加了一套《杀戮尖塔》式的累积难度：**第 1 到第 N 级的规则同时生效**，最多 10 级。

| 级 | 名字 | 效果 |
|---|---|---|
| 1 | 迁徙之时 | 有时会出现不属于本地区的敌人；初始选择点数 10 → 8 |
| 2 | 资源短缺 | 回复与复活只恢复到 60% |
| 3 | 艰苦行动 | 金钱获取降低 15% |
| 4 | 弱点击破 | 敌人打在我方被克制的属性上，伤害 +25% |
| 5 | 严格审核 | 最多 5 只：选人加不了第 6 只，满 5 只时抓不到新的 |
| 6 | 断绝制图 | 拿不到「地图」道具，切换地区时不能选目的地 |
| 7 | 稀缺 | 高级以上的奖励选项各有一半概率不出现 |
| 8 | 训练严苛 | 经验获取变为 80% |
| 9 | 墙立于此 | 所有首领的血条段数 +1 |
| 10 | 联合狩猎 | 20 层之后每 5 层出现一个首领 |

怎么用：

- 进「新游戏」的选人界面时会弹出**进阶等级**（游戏原生的列表窗口），选 0–10 级，选完记在这一局。
- 战斗中按 `F8` 可以随时重开这个菜单；左上角显示当前等级，鼠标停上去能看到这一局开了哪些。
- 0 级时和原版完全一样。

实现：

- `coop/ascension.js`：全部规则和界面，每次页面加载后由 main.mjs 注入。
- `scripts/patch-coop.mjs`：多了 7 条补丁，把几个写死的上限改成运行时可变（队伍上限、选人上限、初始点数、奖励稀有度阈值），0 级时读到的仍是原值。

点子与代码：Chess_大概是屑 & 深溟Ming（B 站 <https://space.bilibili.com/358023819>）。
## 自己构建

```bash
npm ci
npm run fetch-game        # 按 game-version.json 把游戏构建拉到 dist/
npm start                 # 本机运行
npm run dist:win          # 出 Windows 便携版 exe + zip
npm run dist:mac          # 出 Mac dmg
```

更新游戏版本：先在手机版仓库同步官方新版本，再把那边的提交号写进 `game-version.json` 的 `sourceRef`。推送 `pokerogue日期` 格式的标签，GitHub Actions 会自动打包并上传到同名 Release。

## 源码与许可证

游戏本体 PokéRogue 由 Pagefault Games 开发，以 AGPL-3.0 开源。这个仓库只做电脑端打包，同样以 AGPL-3.0 发布，见 [LICENSE](LICENSE)。

打包：B 站 UP 主 黑咖啡和冰月亮。免费提供，禁止倒卖。

---

**English:** Offline desktop build (Windows / macOS) of the open-source game [PokéRogue](https://github.com/pagefaultgames/pokerogue) by Pagefault Games, packaged with Electron. Saves stay on your computer. Licensed under AGPL-3.0.
