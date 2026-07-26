# assets/

只放**同源、本地**素材。目录固定为 `images/` 与 `audio/`。

## images/

| 文件 | 用途 |
|---|---|
| `share-cover.svg` | Open Graph / 微信分享封面，原创 SVG 1200×630，不含歌曲结果、照片或专辑封面 |
| `favicon.svg` | 站点图标，原创票根图形 |

## audio/

22 个 MP3，文件名即 `data.js` → `SONG_AUDIO` 中的 `file` 字段，**不可改名、不可改大小写**：

- 19 个正式结果片段：`guan-yi-bei.mp3`、`liu-ceng-lou.mp3`、`gei-bao-zhe-he-zi-de-gu-niang.mp3`、`guo-yuan-chao.mp3`、`yu-wo-jiao-tan.mp3`、`lian-yi-qun.mp3`、`hou-ji.mp3`、`xie-xie-ni.mp3`、`dong-xiao-jie.mp3`、`ge-zi.mp3`、`li-li-an.mp3`、`kong-gang-qu.mp3`、`zai-xiang-xiang.mp3`、`ban-ma-ban-ma.mp3`、`zhi-dao.mp3`、`bu-mo-sheng-de-ren.mp3`、`an-he-qiao.mp3`、`ka-bi-ba-la-de-hai.mp3`、`luo-yan.mp3`
- 3 个永久排除文件：`excluded-intro.mp3`、`excluded-yu-intro.mp3`、`excluded-bie-outro.mp3`

约定：

- 这些 MP3 就是最终剪辑片段，代码不再二次裁切，也不设播放时长上限。
- 项目**不扫描本目录**自动组池；新增或替换音频必须同时更新 `data.js` 的 `SONG_AUDIO`（以及 `audio-manifest.json` 便于人工核对）。
- 引用一律相对路径 `./assets/audio/xxx.mp3`，不要以 `/` 开头，否则 GitHub Pages 子目录部署会 404。

## 不要放进来的东西

- 外部图片（票根由 Canvas 生成，跨域图片会污染画布导致 `toDataURL()` 失败）。
- 艺人照片、专辑封面、实体票根扫描件（未获授权）。
- 远程字体（全部使用系统中文字体栈）。
- 音乐平台外链或试听地址。

19 首歌的抽象符号不是图片，而是 `app.js` 中 `SYMBOLS` 的原创 Canvas 几何绘制函数，因此不存在加载失败问题。

## 未来的小程序码

放 `assets/images/miniprogram-qr.png`（同源 PNG，建议 240×240 以上），按 README 第 12 节修改 `app.js`。当前 Demo 不生成任何二维码。
