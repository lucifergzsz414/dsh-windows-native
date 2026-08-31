# dsh-windows-native MVP 搭建日志（2026-08-30）

## 背景
从"找开源方向"的长讨论里发现 `deepseek-harness`(DSH) 最近5周冲到20万+ star，
带火了插件生态。用 `gh api` 数了 `awesome-dsh-plugin` 列表各分类插件数量，
发现 "WSL & Windows Interop" 只有7个，且**全部是"WSL内怎么访问Windows"**，
没有一个是"纯 Windows 原生环境(不用WSL)"的兼容插件——而这正是用户自己的真实环境
(PowerShell为主，system-env.md记忆写明)。

## 新增了什么
全新项目 `C:\Users\Administrator\dsh-windows-native`，git 已 init(未commit)：
- `package.json`：npm 包定义，`dsh.bundle.patch` 指向 `cordis.patch.yml`（照抄真实
  参考插件 `173787247/dsh-wsl-env` 的清单结构，先用 `gh api` 读了它的
  package.json/cordis.patch.yml/index.js 弄清真实的插件manifest格式，不是猜的）
- `cordis.patch.yml`：插件注册配置
- `index.js`：核心逻辑，导出 `name`/`inject`/`shouldInject`/`buildText`/`apply`。
  检测 `process.platform === 'win32'`（WSL 下 Node 报告的是 linux，天然区分，不需要
  额外判断"是不是WSL"）时往 system prompt 注入 PowerShell 语法/控制台编码/
  .bat中文/junction创建失败 这几类踩坑说明
- `test/index.test.js`：10 个用例，覆盖平台判断分支、文本生成、apply 调用 ctx 的行为
- README.md / LICENSE / .gitignore

## 验证过程
1. 参考真实已上线插件 `173787247/dsh-wsl-env` 的源码（package.json/cordis.patch.yml/
   index.js/test）理解插件系统真实结构，不是凭空猜 API
2. 写完 index.js 后跑 `node --test`，10 个用例全过
3. 修正了 `package.json` 里 `test` 脚本的调用方式（`node --test test/` 报
   `MODULE_NOT_FOUND`，改成 `node --test` 靠默认发现机制才对）后用 `npm test` 复测通过

## 内容来源
NOTES 里列的每一条踩坑，都能对应到用户自己已有记忆/本次对话里真实踩过的坑：
- PowerShell 无 `&&`/`||` —— `system-env.md` 明确记录
- 控制台默认非UTF-8导致中文乱码 —— 本次对话 burnout-dashboard 项目里刚踩过一次并修复
- 中文过bash heredoc容易乱码 —— `no-chinese-through-bash` 记忆
- .bat文件不能有中文 —— `bat-no-chinese` 记忆
- junction/符号链接创建被拒 —— `turbopack-junction-denied` 记忆
不是编造的通用建议，是从真实经历提炼的。

## 端到端真实验证（2026-08-30）
用户确认本机已装 `deepseek-harness`（`dsh web` 正在跑，PID 54724，端口3080）。
- 备份 `~/.dsh/profiles/web/package.json` 后，加了 `"dsh-windows-native": "file:../../../dsh-windows-native"`
  依赖 + `bundles` 数组条目，`pnpm install` 装上（本地路径依赖，不需要先发npm）
- 用 `dsh --dump-config` 确认插件被真实识别注册（配置树里能看到 `dsh-windows-native` 节点，
  `when: windows`/`order: 15` 跟源码对得上）
- 用 `Get-CimInstance Win32_Process` 核实真实PID后 `Stop-Process` 重启 `dsh web`
  （没有瞎杀，先确认了PID对应的CommandLine确实是`dsh web`）
- 用户在真实网页里发消息测试，模型回复里**逐字复述了我们注入的第1-3类说明**
  （PowerShell无&&、控制台编码、.bat纯ASCII、junction静默失败）——证明注入链路
  从插件代码→cordis→system prompt→模型输出，全程真实跑通
- 同一条回复里模型还编了一段跟我们插件无关的内容（Claude Code风格的沙箱/工具术语），
  已判断为模型联想/幻觉，跟用户说明了这不是插件产出、不采信

## 第二轮内容补充（2026-08-30）
从用户自己的记忆库里找真实踩过的坑（不是编的通用建议），新增两类：
- 后台进程杀不干净——停外层包装器不等于端口被释放，得找真实PID精确杀
  （源自[[turbopack-junction-denied]]附带坑 + 本次对话重启dsh web时的真实操作）
- Word/Excel文件被占用写入报PermissionError——不是文件损坏，别硬重试
  （源自[[word-docx-generation]]踩坑4）
- 计划任务后台脚本别用`-WindowStyle Hidden`会闪窗口，用pythonw.exe包一层
  （源自[[hidden-task-launch-pattern]]）
新增2个测试用例覆盖这些内容，`npm test` 11个用例全过。
跳过了[[docker-desktop-winsock-crash]]——那是用户自己机器的AutoStart配置问题，
不是通用Windows/agent模式，不适合放进给别人用的插件里。

## 现状 / 还没做的
- 没有真实的 dsh 环境去实际安装测试这个插件（本机没装 deepseek-harness），
  `apply()` 里对 `ctx.systemPrompt.section` 的调用方式是照抄参考插件推断的，
  没有对着真实 harness 跑通验证过
- package.json 里的 GitHub 仓库地址是占位符，还没决定要不要发布、发到哪个账号
- 没有 commit，没有 push
