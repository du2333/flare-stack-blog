# Cuckoo 主题

一个简洁优雅的博客主题，采用玻璃态（Glassmorphism）设计风格，支持动态背景图片和自定义主色调。

## 特性

- **玻璃态设计** - 半透明卡片、模糊背景效果，现代感十足
- **动态背景** - 支持随机背景图片 API，首页滚动时背景渐变切换
- **自定义主色调** - 通过环境变量轻松配置主题色
- **深色模式** - 完整的深色模式支持，自动适配颜色变量
- **响应式布局** - 移动端优先设计，适配各种屏幕尺寸
- **流畅动画** - 入场动画、悬停效果、过渡动画

## 目录结构

```
cuckoo/
├── components/          # 组件
│   ├── content/         # 内容渲染组件
│   │   ├── code-block.tsx
│   │   ├── content-renderer.tsx
│   │   ├── image-display.tsx
│   │   └── render.tsx
│   ├── background-layer.tsx  # 背景图层
│   ├── post-card.tsx         # 文章卡片
│   └── sidebar.tsx           # 侧边栏
├── layouts/             # 布局
│   ├── auth-layout.tsx  # 认证页面布局
│   ├── footer.tsx       # 页脚
│   ├── mobile-menu.tsx  # 移动端菜单
│   ├── navbar.tsx       # 导航栏
│   ├── public-layout.tsx # 公共页面布局
│   └── user-layout.tsx  # 用户页面布局
├── pages/               # 页面
│   ├── auth/            # 认证页面
│   ├── friend-links/    # 友链页面
│   ├── home/            # 首页
│   ├── post/            # 文章详情
│   ├── posts/           # 文章列表
│   ├── search/          # 搜索页面
│   ├── submit-friend-link/ # 申请友链
│   └── user/            # 用户中心
├── styles/
│   └── index.css        # 主题样式
├── config.ts            # 主题配置
└── index.ts             # 主题入口
```

## 配置

### 环境变量

在 `.env` 文件中配置以下变量：

```bash
# 封面图片
VITE_CUCKOO_COVER_IMAGE=/images/cover.webp

# 头像
VITE_CUCKOO_AVATAR=/images/avatar.png

# 主色调（十六进制颜色）
VITE_CUCKOO_PRIMARY_COLOR=#39C5BB

# 背景图片配置
VITE_CUCKOO_BACKGROUND_ENABLED=true
VITE_CUCKOO_BACKGROUND_API=https://www.dmoe.cc/random.php
VITE_CUCKOO_BG_LIGHT_OPACITY=0.8
VITE_CUCKOO_BG_DARK_OPACITY=0.75
VITE_CUCKOO_BG_TRANSITION=600
```

### 配置说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_CUCKOO_COVER_IMAGE` | 封面图片路径 | `/images/home-bg.webp` |
| `VITE_CUCKOO_AVATAR` | 头像图片路径 | `/images/avatar.png` |
| `VITE_CUCKOO_PRIMARY_COLOR` | 主题主色调 | `#39C5BB` |
| `VITE_CUCKOO_BACKGROUND_ENABLED` | 是否启用背景图片 | `true` |
| `VITE_CUCKOO_BACKGROUND_API` | 随机背景图片 API | `https://www.dmoe.cc/random.php` |
| `VITE_CUCKOO_BG_LIGHT_OPACITY` | 浅色模式背景透明度 | `0.8` |
| `VITE_CUCKOO_BG_DARK_OPACITY` | 深色模式背景透明度 | `0.75` |
| `VITE_CUCKOO_BG_TRANSITION` | 背景过渡时间 (ms) | `600` |

### 主题配置

在 `config.ts` 中可调整以下参数：

```typescript
export const config: ThemeConfig = {
  home: {
    featuredPostsLimit: 4,  // 首页展示文章数
  },
  posts: {
    postsPerPage: 12,       // 每页文章数
  },
  post: {
    relatedPostsLimit: 3,   // 相关文章数
  },
};
```

## CSS 变量

主题使用 CSS 变量实现样式定制，主要变量包括：

### 颜色

```css
--cuckoo-primary          /* 主色 */
--cuckoo-primary-hover    /* 主色悬停 */
--cuckoo-primary-active   /* 主色激活 */
--cuckoo-secondary        /* 次要色 */
--cuckoo-accent           /* 强调色 */
```

### 文字

```css
--cuckoo-text-heading     /* 标题文字 */
--cuckoo-text-primary     /* 主要文字 */
--cuckoo-text-secondary   /* 次要文字 */
--cuckoo-text-muted       /* 弱化文字 */
```

### 背景

```css
--cuckoo-page-bg          /* 页面背景 */
--cuckoo-card-bg          /* 卡片背景 */
--cuckoo-sidebar-bg       /* 侧边栏背景 */
--cuckoo-glass-bg         /* 玻璃态背景 */
```

### 效果

```css
--cuckoo-shadow-sm        /* 小阴影 */
--cuckoo-shadow           /* 常规阴影 */
--cuckoo-shadow-lg        /* 大阴影 */
--cuckoo-radius-sm        /* 小圆角 */
--cuckoo-radius           /* 常规圆角 */
--cuckoo-radius-lg        /* 大圆角 */
```

## 组件类名

主题提供了一系列预设的组件类名：

### 卡片

```html
<div class="cuckoo-card">常规卡片</div>
<div class="cuckoo-glass-card">玻璃态卡片</div>
<div class="cuckoo-post-card">文章卡片</div>
```

### 按钮

```html
<button class="cuckoo-btn cuckoo-btn-primary">主按钮</button>
<button class="cuckoo-btn cuckoo-btn-secondary">次要按钮</button>
<button class="cuckoo-btn cuckoo-btn-ghost">幽灵按钮</button>
```

### 文字

```html
<h1 class="cuckoo-heading">标题</h1>
<p class="cuckoo-text-primary">主要文字</p>
<p class="cuckoo-text-secondary">次要文字</p>
<p class="cuckoo-text-muted">弱化文字</p>
```

### 其他

```html
<input class="cuckoo-input" />
<span class="cuckoo-tag">标签</span>
<img class="cuckoo-avatar" />
```

## 动画

```html
<div class="cuckoo-fade-in">淡入</div>
<div class="cuckoo-slide-up">上滑</div>
<div class="cuckoo-scale-in">缩放</div>
```

## 背景效果

主题支持动态背景图片，首页滚动时会有渐变切换效果：

- 首页顶部：背景完全显示
- 向下滚动：背景逐渐淡出
- 其他页面：背景以设定透明度显示

背景图片通过 API 获取，每次刷新页面会加载不同的图片。

## 致谢

本主题灵感来源于 [Cuckoo](https://github.com/bhaoo/Cuckoo)，由 [Tensin](https://github.com/SkyDream01) 移植。

## 许可证

本主题基于 [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0.html) 开源。

```
Copyright (C) 2024

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
```
