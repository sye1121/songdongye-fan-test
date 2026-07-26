# 在宋冬野的歌里，你是谁 · 歌曲人格测试 H5

一个可长期运行的乐迷互动 H5：回答十道生活情境题，得到与自己最接近的一首宋冬野歌曲、对应的歌曲人格、完整解读、一张可保存的纪念票根，并在结果揭晓时播放这首歌的真实剪辑片段。

- 这是**歌曲人格测试**，不是音乐知识问答。题目里不出现歌曲名，也不问歌词与专辑年份。
- 结果池严格限定为两张正式专辑中的 **19 首正式歌曲**；Intro、雨(Intro)、别(Outro) 永不参与。
- 全部解读为原创文字，不使用完整歌词，不使用未经提供的照片或专辑封面。
- 结果仅供文化娱乐体验，不是心理测评。活动长期有效，不绑定城市或场次。

---

## 1. 文件树

```text
/
├── index.html                 6 个页面状态 + 唯一 <audio id="result-audio">
├── styles.css                 暗色巡演票根与乐迷档案视觉系统
├── data.js                    唯一数据源：白名单 / 音频映射 / 题目 / 19 首结果 / 校验
├── audio.js                   播放器：单实例、状态机、真实时长、进度、错误处理
├── app.js                     状态、评分、渲染、Canvas 票根、保存、调试
├── audio-manifest.json        音频清单（人工核对用；运行时事实源仍是 data.js）
├── README.md
└── assets/
    ├── README.md
    ├── images/
    │   ├── share-cover.svg    分享封面（原创 SVG）
    │   └── favicon.svg
    └── audio/                 22 个 MP3（19 首正式 + 3 个 excluded-）
        ├── guan-yi-bei.mp3
        ├── liu-ceng-lou.mp3
        ├── gei-bao-zhe-he-zi-de-gu-niang.mp3
        ├── guo-yuan-chao.mp3
        ├── yu-wo-jiao-tan.mp3
        ├── lian-yi-qun.mp3
        ├── hou-ji.mp3
        ├── xie-xie-ni.mp3
        ├── dong-xiao-jie.mp3
        ├── ge-zi.mp3
        ├── li-li-an.mp3
        ├── kong-gang-qu.mp3
        ├── zai-xiang-xiang.mp3
        ├── ban-ma-ban-ma.mp3
        ├── zhi-dao.mp3
        ├── bu-mo-sheng-de-ren.mp3
        ├── an-he-qiao.mp3
        ├── ka-bi-ba-la-de-hai.mp3
        ├── luo-yan.mp3
        ├── excluded-intro.mp3
        ├── excluded-yu-intro.mp3
        └── excluded-bie-outro.mp3
```

原生 HTML / CSS / JavaScript，无框架、无构建、无 npm、无后端、无数据库、无远程 API、无远程字体、无跨域图片、无临时 Blob URL。

视觉以《安和桥北》的暗红纸面作为记忆底色，以《再想想》的黑白影像和黄绿色手写作为信号色。全站使用方角、发丝线、穿孔线和票据编号，不采用音乐流媒体 App 的专辑卡片结构。设计参数为 `DESIGN_VARIANCE: 6`、`MOTION_INTENSITY: 5`、`VISUAL_DENSITY: 5`。

## 2. 本地预览

双击 `index.html` 即可跑完整流程；想与线上完全一致（音频与相对路径行为）建议起一个静态服务：

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## 3. 上传 GitHub

```bash
git init
git add .
git commit -m "宋冬野歌曲人格测试 H5"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

## 4. 开启 GitHub Pages

Settings → Pages → Source 选 `Deploy from a branch` → Branch `main` / `(root)` → Save。
1–2 分钟后访问 `https://<用户名>.github.io/<仓库名>/`。

不需要 `.nojekyll`（无下划线开头目录）。

## 5. 为什么必须相对路径

项目站点部署在**子目录**下。`/assets/audio/li-li-an.mp3` 会被解析到域名根目录并 404；本项目一律使用 `./assets/audio/li-li-an.mp3` 这类相对路径，且所有文件名为**小写 ASCII、严格区分大小写**。禁止本地绝对路径、`file://` 路径与上传平台的临时资源地址。

---

## 6. songId 是唯一主键

19 个合法 songId（`data.js` → `EXPECTED_SONG_IDS`）：

| songId | 歌曲 | 音频文件 |
|---|---|---|
| `guan-yi-bei` | 关忆北 | guan-yi-bei.mp3 |
| `liu-ceng-lou` | 六层楼 | liu-ceng-lou.mp3 |
| `gei-bao-zhe-he-zi-de-gu-niang` | 给抱着盒子的姑娘 | gei-bao-zhe-he-zi-de-gu-niang.mp3 |
| `guo-yuan-chao` | 郭源潮 | guo-yuan-chao.mp3 |
| `yu-wo-jiao-tan` | 与我交谈 | yu-wo-jiao-tan.mp3 |
| `lian-yi-qun` | 连衣裙 | lian-yi-qun.mp3 |
| `hou-ji` | 后记 | hou-ji.mp3 |
| `xie-xie-ni` | 谢谢你 | xie-xie-ni.mp3 |
| `dong-xiao-jie` | 董小姐 | dong-xiao-jie.mp3 |
| `ge-zi` | 鸽子 | ge-zi.mp3 |
| `li-li-an` | 莉莉安 | li-li-an.mp3 |
| `kong-gang-qu` | 空港曲 | kong-gang-qu.mp3 |
| `zai-xiang-xiang` | 再想想 | zai-xiang-xiang.mp3 |
| `ban-ma-ban-ma` | 斑马，斑马 | ban-ma-ban-ma.mp3 |
| `zhi-dao` | 知道 | zhi-dao.mp3 |
| `bu-mo-sheng-de-ren` | 不陌生的人 | bu-mo-sheng-de-ren.mp3 |
| `an-he-qiao` | 安和桥 | an-he-qiao.mp3 |
| `ka-bi-ba-la-de-hai` | 卡比巴拉的海 | ka-bi-ba-la-de-hai.mp3 |
| `luo-yan` | 落雁 | luo-yan.mp3 |

历史上出现过的英文短 ID（`lilian` / `pigeon` / `anfangheqiao` 等）已**全部废止且不保留兼容别名**。中文歌名只负责展示，程序内部一律用 songId 关联；音频只能通过 `SONG_AUDIO[result.songId]` 读取，禁止用中文名、数组下标或随机数取音频。

## 7. 数据在哪里改

| 你想改 | 位置 |
|---|---|
| 题目与选项文案 | `data.js` → `QUESTIONS[i].text` / `options[j].label` |
| 选项的人格倾向 | `data.js` → `QUESTIONS[i].options[j].v`（8 维增量向量，键必须是 `DIMENSIONS` 之一） |
| 歌曲人格名 / 短文案 / 完整解读 / 关键词 | `data.js` → `RESULTS[i]`（`personalityName` / `shortDescription` / `fullDescription` / `keywords`） |
| 歌曲人格向量 | `data.js` → `RESULTS[i].vector`（-3 ~ +3） |
| 维度权重 | `data.js` → `DIMENSION_WEIGHTS` |
| 结果池均衡校准值 | `data.js` → `RESULTS[i].calibration` |
| 音频映射 | `data.js` → `SONG_AUDIO`（唯一事实源） |
| 巡演信息 | `data.js` → `TOUR_CONFIG`（`enabled` / `message` / `cities`，与测试逻辑解耦） |
| 视觉变量 | `styles.css` → `:root` |
| 票根布局 | `app.js` → `renderTicket()`；符号在 `SYMBOLS` |
| 票根底部小程序码预留文案 | `app.js` → `SHOW_MINIPROGRAM_NOTE` |

### 结果数据结构

```js
{
  songId: "li-li-an",
  title: "莉莉安",
  album: "安和桥北",
  personalityName: "…",
  shortDescription: "…",
  fullDescription: "…",   // 段落用 \n\n 分隔
  keywords: ["…"],
  symbol: "shoreName",    // 原创 Canvas 抽象符号
  vector: { memory: 2, … },
  calibration: 0.0201
}
```

`ticketCode` 不是静态数据：签发票根时由 `app.js` 的 `makeTicketCode()` 生成（格式 `SDY-YYYYMMDD-XXXX`），存入 localStorage 并挂到运行时结果对象上。同一次结果重复保存编号不变，「再测一次」后生成新编号。

### 评分逻辑（`app.js`）

1. 每个选项提供 8 维增量向量 → 累加为用户向量（`buildUserVector`）。
2. 标准化为单位向量（`normalizeVector`）。
3. 与 19 首歌分别计算**加权余弦相似度**与**加权欧氏距离**。
4. 得分 = `0.72 × 方向相似度 + 0.28 × 接近度 + calibration + 稳定微偏移`。
5. **无随机**：微偏移来自答案序列的 FNV-1a 哈希（`stableHash`），仅用于极接近时平分；同一组答案永远得到同一首歌。
6. 顶名 songId 若不在白名单中，不做随机兜底，直接报错提示重测。
7. `calibration` 由全量答案组合（4¹⁰ = 1,048,576）拟合，使 19 首歌命中率均在 **5.17%–5.32%**，热门歌不占优。改动向量或题目后可重新拟合。

## 8. 音频与揭晓流程

上传的 MP3 **本身就是最终剪辑片段**：从第 0 秒播放到文件自然结束，不二次裁切、不设 15/30/60 秒上限、不用定时器强制暂停、不改变速率、不循环、不随机播放。

流程：答完 10 题 → 签发我的纪念票根 → 立即计算结果 → `prepareResultAudio(result.songId)` 设置 src 并 `load()`（**只预加载命中的一首**）→ 1.8 秒签发动画 → 出现「揭晓我的歌」并提示「点击后将播放歌曲片段」→ 用户点击，在同一个事件里 `audio.play()`，同时揭晓歌名、人格、解读与票根 → 播放到自然结束后出现「再听一次」。

页面只有一个 `<audio id="result-audio" preload="none" playsinline>`，事件只注册一次（`audio.js`）。总时长只来自 `audio.duration`，无效时显示 `--:--`。进度条是原生 `range`，元数据未加载前禁用，可键盘操作。

生命周期：切后台（`visibilitychange`）与 `pagehide` 自动暂停；「再测一次」会 `pauseResultAudio()` + `resetResultAudio()` 并清空当前歌曲、时间、状态、错误与旧结果引用；新结果覆盖旧结果时先暂停归零再换 src；快速连点不会叠加播放。

播放失败或被浏览器拒绝时：结果照常揭晓，票根照常生成与保存，界面只显示「歌曲片段暂时无法播放」或「点击播放按钮即可听取歌曲片段」，技术细节只进调试面板与控制台。

## 9. 排除文件

`excluded-intro.mp3`（Intro）、`excluded-yu-intro.mp3`（雨 Intro）、`excluded-bie-outro.mp3`（别 Outro）随包提供，但不在白名单、不在 `SONG_AUDIO`、不在题目权重、不在调试选择器，也不会被任何兜底逻辑选中。项目**不扫描 `assets/audio/` 目录**，只按 `SONG_AUDIO` 白名单取音频；`validateProjectData()` 会在启动时断言这三个文件没有混入映射。

## 10. 调试模式

```text
?debug=result&result=li-li-an
?debug=result&result=an-he-qiao
?debug=result&result=gei-bao-zhe-he-zi-de-gu-niang
?debug=1            （只开面板，正常答题）
```

调试面板显示：数据校验结果、songId、中文歌名、音频文件名、解析后的音频 URL、播放器状态、`currentTime`、`duration`、最近一次音频错误、用户 8 维向量；点「得分排序」可展开 19 首得分与每题向量贡献；还有「清除本地状态」与只列出 19 个合法结果的下拉选择器。

`?result=<非法 ID>` 提示「无效的歌曲结果 ID」并停在开场页，**不随机回退**。正式模式（无 `debug` 参数）不显示任何调试信息。

## 11. 启动一致性验证

`data.js` 的 `validateProjectData(RESULTS, QUESTIONS)` 在启动时运行，验证：结果恰好 19 项、`SONG_AUDIO` 恰好 19 项、两个 songId 集合与白名单完全一致、中文歌名一一对应、无重复 ID、无重复文件、无 Intro/Outro、题目向量维度合法、（若将来加入 `option.weights`）权重键必须属于白名单。失败时抛出明确错误并写入控制台与调试面板，普通用户界面不显示技术细节。

## 12. 未来接入小程序码

当前不生成任何二维码，票根右下角只有一行很轻的「小程序码将在正式版本接入」。接入时：把同源 PNG 放进 `assets/images/`，在 `buildTicketImage()` 里 `new Image()` 载入并在 `onload` 之后再 `renderTicket()` + `toDataURL()`（必须等图片加载完成才导出），在 `renderTicket()` 页脚 `ctx.drawImage()`，并把 `SHOW_MINIPROGRAM_NOTE` 改为 `false`。

## 13. 不收集哪些数据

不登录、不获取手机号 / 头像 / 微信身份 / 地理位置，不使用 Cookie，不接入统计或广告 SDK。昵称只在本机保存与绘制。`localStorage` 键 `sdy.songticket.v2` 只存：当前题号、当前答案、当前昵称、当前结果 songId、当前票根编号。存储不可用时自动降级为内存状态，流程仍可完成。

## 14. 迁移微信小程序

**可复用**：`data.js` 全部数据（题目、19 首人格、音频映射、TOUR_CONFIG）、`app.js` 的评分纯函数（`buildUserVector` / `normalizeVector` / `weightedCosine` / `weightedDistance` / `stableHash` / `scoreAll`）、昵称清洗 `sanitizeNickname()`、票根布局坐标与 `SYMBOLS` 符号函数、`styles.css` 的视觉变量。

**需重写**：HTML → WXML；CSS → WXSS（`rpx`、安全区）；DOM 操作 → `setData`；`HTMLAudioElement` → `wx.createInnerAudioContext()`（`onCanplay` / `onTimeUpdate` / `onEnded` / `onError`，小程序无自动播放限制但仍建议保留点击揭晓）；浏览器 Canvas → 小程序 `type="2d"` Canvas；`<a download>` / 长按保存 → `wx.canvasToTempFilePath()` + `wx.saveImageToPhotosAlbum()`；分享 → `onShareAppMessage()` / `onShareTimeline()`；localStorage → `wx.setStorageSync`。

## 15. 保存兼容与移动端

| 环境 | 保存行为 |
|---|---|
| 桌面浏览器 | 点击「保存票根」直接下载 `songdongye-result-<songId>.png` |
| Android 浏览器 | 优先下载，失败时提示长按票根图片保存 |
| iOS Safari / 微信 | 直接呈现完整票根图片，提示长按保存到相册，不依赖 `download` 属性 |

票根导出固定 **1080 × 1440** 高清 PNG，页面内按比例缩放；票根不绘制播放器、进度或「再听一次」，也不依赖音频加载成功。

移动端：`min-height: 100dvh`、`env(safe-area-inset-*)`、无横向滚动、触控区 ≥ 44×44px、320–430px 与平板 / 桌面均已适配（桌面只把内容居中，不做手机外壳）；长歌名（《给抱着盒子的姑娘》）完整显示；「揭晓我的歌」不换行；支持 `prefers-reduced-motion: reduce`（跳过签发动画与打字效果，直接显示结果，播放与保存不受影响）。
