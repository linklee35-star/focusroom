# Focus Room

一个用来「专注」的小房间 —— 番茄钟、沉浸式音乐播放器、玻璃拟态 UI，全部跑在浏览器里。

> 不是又一个番茄钟：它把「计时 + 音乐 + 场景」放在同一个空间里。选一个房间，放下手机，开始专注。

## ✨ 功能

- **番茄钟**：专注/休息循环、进度环动画、键盘快捷键（空格开始/暂停、F 全屏）
- **沉浸式播放器**（`/player`）：全屏大图 + 歌词，本地音频拖入即播，自动读取 ID3 标签（歌名/歌手/封面）
- **音乐搜索**：内置网易云音乐代理（服务端搜索 → 封面 → 歌词），输歌名即可找歌
- **多房间**（`/room/[slug]`）：不同场景（学习/工作/深夜），URL 直达，可分享
- **动效**：GSAP + Framer Motion 的入场与过渡，Lenis 平滑滚动
- **玻璃拟态 UI**：GlassCard / GlassButton / CircularProgress，深色主题

## 🧱 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 |
| 样式 | Tailwind CSS 4 |
| 动效 | GSAP（@gsap/react）+ Framer Motion + Lenis |
| 音乐 | jsmediatags（ID3 解析）+ 网易云代理（App Router API Route） |
| 语言 | TypeScript（strict） |

## 🚀 本地运行

```bash
npm install
npm run dev        # 开发模式（默认 3000 端口）
npm run build      # 生产构建
npm run start      # 生产运行
```

> 音乐搜索依赖 `/api/music/recognize` 服务端路由（代理网易云，绕过 CORS），需要 Node 运行时，**不能用纯静态导出部署**。
> 音频文件只在浏览器本地播放，不上传。

Windows 用户可直接双击 `Start-FocusRoom.bat`（端口 3212）。

## ☁️ 部署

任意支持 Next.js 服务端的平台均可（Vercel / 自建 Node）：

```bash
# Vercel
npm i -g vercel && vercel --prod
```

## 📁 目录结构

```
src/app/
  page.tsx              主房间（番茄钟 + 专注面板）
  player/page.tsx       全屏音乐播放器
  room/[slug]/page.tsx  动态房间
  api/music/recognize/  网易云音乐代理（搜索 → 封面 → 歌词）
src/components/
  sections/             AudioPlayer / FocusPanel / HeroSection
  ui/                   GlassCard / GlassButton / CircularProgress
  motion/               FadeInView / PageTransition
src/hooks/              usePomodoro / useKeyboard / useFullscreen
src/context/            AudioContext（全局播放状态）
```

## ⚠️ 说明

- 音乐搜索接口仅用于个人学习与自用，请遵守网易云音乐的服务条款，不要用于商业分发
- 所有数据（番茄钟记录、音频）都在本地浏览器，无后端存储

## 📄 License

[MIT](./LICENSE)
