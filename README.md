# AI 漫剧生成平台

[English](#english) | [中文](#中文)

---

## English

### AI Comic-to-Video Platform

An AI-powered platform that transforms manga/comics (EPUB format) into dynamic manga videos with AI-generated audio (voice, BGM, SFX).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

#### Features

- **EPUB Import** — Upload manga/comic EPUB files for processing
- **AI Voice Synthesis** — Convert dialogue to natural speech (GPT-SoVITS, ElevenLabs, Azure TTS)
- **AI BGM Generation** — Generate background music matching the scene mood (MiniMax, Suno, MusicGen)
- **AI Sound Effects** — Add contextual sound effects (ElevenLabs, AI RES)
- **Video Synthesis** — Combine audio tracks with visual elements into final video
- **User System** — Register, login, and manage your projects
- **Social Features** — Like, comment, and favorite community projects
- **Gallery** — Browse and discover community-created manga videos
- **Multi-Resolution Output** — Support for 480p, 720p, 1080p, and 4K
- **Multiple Aspect Ratios** — 16:9, 9:16, 1:1, 4:3

#### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite + better-sqlite3 |
| Auth | NextAuth.js |
| AI Voice | GPT-SoVITS, ElevenLabs, Azure TTS |
| AI BGM | MiniMax, Suno, MusicGen |
| AI SFX | ElevenLabs, AI RES |
| Video | Custom VideoSynthesizer (mp4/webm/mov) |

#### Quick Start

```bash
# Clone the repository
git clone https://github.com/lh81192/AI-dongtaiman.git
cd AI-dongtaiman

# Install dependencies
npm install

# Initialize database
npm run db:init

# Start development server
npm run dev
```

Then visit http://localhost:3000

#### Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Configure the following environment variables:

- `NEXTAUTH_SECRET` — Secret key for NextAuth
- `NEXTAUTH_URL` — Application URL
- `DATABASE_PATH` — Path to SQLite database
- `GPT_SOVITS_API_URL` / `GPT_SOVITS_API_KEY` — GPT-SoVITS configuration
- `ELEVENLABS_API_KEY` — ElevenLabs configuration
- `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID` — MiniMax configuration

#### Project Structure

```
src/
├── app/                  # App Router pages
│   ├── (auth)/           # Authentication pages (login, register)
│   ├── (dashboard)/      # User dashboard pages
│   ├── (home)/           # Home and gallery pages
│   ├── (public)/         # Public pages (project, user profiles)
│   └── api/              # API routes
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   ├── project/         # Project-related components
│   ├── social/          # Social feature components
│   └── player/          # Video player components
├── lib/                  # Core libraries
│   ├── ai/              # AI service adapters
│   │   ├── adapters/    # GPT-SoVITS, ElevenLabs, MiniMax
│   │   ├── factory.ts   # AI service factory
│   │   ├── types.ts     # AI service types
│   │   └── video-synthesizer.ts  # Video synthesis
│   ├── db.ts           # Database connection
│   ├── auth.ts         # NextAuth configuration
│   └── utils.ts        # Utilities
└── types/              # TypeScript type definitions
data/                   # SQLite database files
scripts/               # Database initialization scripts
```

#### Generation Pipeline

```
EPUB File Upload
      ↓
   EPUB Parsing
      ↓
   Scene Extraction
      ↓
   AI Voice Synthesis (GPT-SoVITS / ElevenLabs / Azure TTS)
      ↓
   AI BGM Generation (MiniMax / Suno / MusicGen)
      ↓
   AI SFX Generation (ElevenLabs / AI RES)
      ↓
   Video Synthesis (Audio + Visual Composition)
      ↓
   Final Video Output (mp4 / webm / mov)
```

### AI Manga-to-Video Generation Pipeline

```
EPUB Upload → Parse → AI Scene Analysis → Key Frame Generation
    ↓
Video Clip Generation (with frame continuity) → Audio Synthesis
    ↓
Final Video Composition → Output
```

**Pipeline Steps:**

1. **EPUB Parsing** - Extract manga pages, images, and text
2. **AI Scene Analysis** - LLM analyzes each panel for:
   - Scene description and setting
   - Camera type and movement
   - Character actions and emotions
   - Dialogue extraction
   - Mood and visual style
3. **Key Frame Generation** - Create first frame (original image) and last frame (AI-generated for continuity)
4. **Video Clip Generation** - Generate 3-5 second video clips using external APIs (MiniMax, Seedance)
   - Last frame of each clip connects to the first frame of the next
   - No overlapping frames between clips
5. **Audio Synthesis** - Generate:
   - Voice synthesis for dialogues
   - Background music (BGM) matching the mood
   - Sound effects (SFX)
6. **Video Composition** - Combine video clips with audio tracks

**Key Features:**
- **Frame Continuity**: Last frame of each segment becomes the reference for seamless transitions
- **Story Integrity**: All panels are processed to maintain complete story flow
- **Multi-Model Support**: Uses configured text, image, video, and audio models

### Model Configuration

The platform supports multiple AI model providers with different protocols:

#### Text Models
| Protocol | Providers |
|----------|-----------|
| 国产协议 | 智谱 AI, 通义千问, 文心一言, MiniMax, DeepSeek, 月之暗面 |
| OpenAI 协议 | OpenAI, SiliconFlow, TogetherAI, Groq, Ollama |
| Gemini 协议 | Google Gemini |

#### Image Models
| Protocol | Providers |
|----------|-----------|
| 国产协议 | 智谱 CogView, 通义万相, 百度图像生成 |
| OpenAI 协议 | DALL-E, Stability AI |
| Gemini 协议 | Google Imagen |

#### Video Models
| Protocol | Providers |
|----------|-----------|
| Seedance 协议 | 字节 Seedance |
| 国产协议 | 智谱 CogVideoX, MiniMax 视频 |
| Google 协议 | Google Veo |

Users can configure multiple providers and set a default for each type via the Settings page.

**Configuration Steps:**
1. Visit `/dashboard/settings` after logging in
2. Select the model type (text/image/video)
3. Choose a provider and enter API credentials
4. Optionally fetch available models from the provider API
5. Set as default if desired

#### License

MIT

---

## 中文

### AI 漫剧生成平台

一个将漫画/电子书（EPUB 格式）转化为动态漫剧视频的 AI 平台，支持 AI 语音合成、背景音乐生成和音效合成。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

#### 核心功能

- **EPUB 导入** — 上传漫画/电子书 EPUB 文件进行处理
- **AI 语音合成** — 将对白转换为自然语音（GPT-SoVITS、ElevenLabs、Azure TTS）
- **AI 背景音乐** — 根据场景情绪生成背景音乐（MiniMax、Suno、MusicGen）
- **AI 音效合成** — 添加场景音效（ElevenLabs、AI RES）
- **视频合成** — 将音轨与视觉元素合成为最终视频
- **用户系统** — 注册、登录并管理您的作品
- **社交功能** — 点赞、评论、收藏社区作品
- **作品广场** — 浏览和发现社区创作的漫剧视频
- **多分辨率输出** — 支持 480p、720p、1080p、4K
- **多种画幅比例** — 16:9、9:16、1:1、4:3

#### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 数据库 | SQLite + better-sqlite3 |
| 认证 | NextAuth.js |
| AI 语音 | GPT-SoVITS、ElevenLabs、Azure TTS |
| AI 背景音乐 | MiniMax、Suno、MusicGen |
| AI 音效 | ElevenLabs、AI RES |
| 视频 | 自研 VideoSynthesizer（mp4/webm/mov） |

#### 快速开始

```bash
# 克隆仓库
git clone https://github.com/lh81192/AI-dongtaiman.git
cd AI-dongtaiman

# 安装依赖
npm install

# 初始化数据库
npm run db:init

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

#### 环境配置

复制 `.env.example` 到 `.env.local` 并进行配置：

```bash
cp .env.example .env.local
```

需要配置以下环境变量：

- `NEXTAUTH_SECRET` — NextAuth 密钥
- `NEXTAUTH_URL` — 应用 URL
- `DATABASE_PATH` — SQLite 数据库路径
- `GPT_SOVITS_API_URL` / `GPT_SOVITS_API_KEY` — GPT-SoVITS 配置
- `ELEVENLABS_API_KEY` — ElevenLabs 配置
- `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID` — MiniMax 配置

#### 项目结构

```
src/
├── app/                  # App Router 页面
│   ├── (auth)/           # 认证页面（登录、注册）
│   ├── (dashboard)/      # 用户仪表盘页面
│   ├── (home)/           # 首页和作品广场
│   ├── (public)/         # 公开页面（作品、用户主页）
│   └── api/              # API 路由
├── components/           # React 组件
│   ├── ui/              # shadcn/ui 组件
│   ├── layout/          # 布局组件
│   ├── project/         # 项目相关组件
│   ├── social/          # 社交功能组件
│   └── player/          # 视频播放器组件
├── lib/                  # 核心库
│   ├── ai/              # AI 服务适配器
│   │   ├── adapters/    # GPT-SoVITS、ElevenLabs、MiniMax
│   │   ├── factory.ts   # AI 服务工厂
│   │   ├── types.ts     # AI 服务类型定义
│   │   └── video-synthesizer.ts  # 视频合成器
│   ├── db.ts           # 数据库连接
│   ├── auth.ts         # NextAuth 配置
│   └── utils.ts        # 工具函数
└── types/              # TypeScript 类型定义
data/                   # SQLite 数据库文件
scripts/               # 数据库初始化脚本
```

#### 生成流程

```
EPUB 文件上传
      ↓
   EPUB 解析
      ↓
   场景提取
      ↓
   AI 语音合成（GPT-SoVITS / ElevenLabs / Azure TTS）
      ↓
   AI 背景音乐生成（MiniMax / Suno / MusicGen）
      ↓
   AI 音效合成（ElevenLabs / AI RES）
      ↓
   视频合成（音轨 + 视觉元素合成）
      ↓
   最终视频输出（mp4 / webm / mov）
```

#### 开源协议

MIT
