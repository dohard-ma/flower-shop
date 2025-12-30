# 小红书助手 v2.0 - 现代化升级版

## 🎉 重大更新

小红书助手现已升级为 **混合架构**，结合了浏览器插件的便捷性和现代 Web 应用的强大功能！

### ✨ 新特性

- 🌐 **现代化 Web 管理界面**：基于 Next.js + TypeScript + Tailwind CSS + shadcn/ui
- 📊 **数据可视化**：实时统计图表、趋势分析
- 🔄 **实时同步**：插件与 Web 应用之间的实时数据通信
- 💾 **持久化存储**：API 驱动的数据管理
- 🎨 **响应式设计**：适配各种屏幕尺寸
- 🔐 **类型安全**：完整的 TypeScript 类型定义

## 🏗️ 架构概览

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  浏览器插件     │    │   Next.js Web    │    │  小红书网站     │
│  (前端交互)     │◄──►│   应用 (数据管理) │    │  (数据来源)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
  - 页面内容采集            - API 路由                - 博主信息
  - 用户界面              - 数据存储                - 内容数据
  - 插件通信              - 统计分析                - 搜索结果
```

### 🔄 数据流

1. **插件采集数据** → 发送到 Next.js API
2. **Next.js 处理数据** → 存储 + 分析 + 统计
3. **Web 界面展示** → 实时更新 + 可视化
4. **双向通信** → 插件 ↔ Web 应用实时同步

## 🚀 快速开始

### 1. 安装依赖

#### 启动 Next.js Web 应用

```bash
# 进入 web 应用目录
cd web-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

Web 应用将在 <http://localhost:3000> 启动

#### 安装浏览器插件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录 (`xhs-extends`)

### 2. 使用方法

#### 方式一：现代化 Web 界面（推荐）

1. 确保 Next.js 应用正在运行 (`npm run dev`)
2. 点击插件图标
3. 选择 **"Web 管理界面"**
4. 享受现代化的数据管理体验！

#### 方式二：经典界面

1. 点击插件图标
2. 选择 **"经典界面"**
3. 使用传统的简洁操作界面

## 📁 项目结构

```
xhs-extends/
├── web-app/                    # Next.js Web 应用
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/           # API 路由
│   │   │   │   ├── bloggers/  # 博主数据管理
│   │   │   │   ├── search/    # 搜索记录管理
│   │   │   │   └── stats/     # 统计数据
│   │   │   ├── page.tsx       # 主界面
│   │   │   └── layout.tsx     # 应用布局
│   │   ├── components/ui/     # shadcn/ui 组件
│   │   └── lib/
│   │       └── plugin-api.ts  # 插件通信 API
│   ├── package.json
│   └── ...
├── sidebar-web.html           # Web 应用加载器
├── background.js              # 后台服务
├── content.js                 # 内容脚本
└── manifest.json             # 插件配置
```

## 🛠️ 技术栈

### Web 应用技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4.0
- **组件库**: shadcn/ui
- **图标**: Lucide React
- **构建工具**: Vite

### 插件技术栈

- **API**: Chrome Extension Manifest V3
- **核心**: Side Panel API
- **脚本**: Content Scripts + Background Service Worker
- **通信**: Chrome Runtime + PostMessage API

## 🔧 API 接口

### 博主管理 `/api/bloggers`

```typescript
// GET - 获取博主列表
GET /api/bloggers?page=1&limit=10&search=关键词

// POST - 添加新博主
POST /api/bloggers
{
  "nickname": "博主昵称",
  "xhsId": "小红书ID",
  "followers": "粉丝数",
  "posts": 笔记数,
  // ...
}

// PUT - 更新博主信息
PUT /api/bloggers
{
  "id": "博主ID",
  "nickname": "新昵称",
  // ...
}
```

### 搜索记录 `/api/search`

```typescript
// GET - 获取搜索历史
GET /api/search?sortBy=lastUsed&order=desc

// POST - 记录搜索
POST /api/search
{
  "keyword": "搜索关键词",
  "results": 结果数量,
  "source": "plugin" | "web"
}
```

### 统计数据 `/api/stats`

```typescript
// GET - 获取统计信息
GET /api/stats?type=overview|keywords|activity|charts

// POST - 记录活动
POST /api/stats
{
  "type": "search" | "collection",
  "content": "活动描述"
}
```

## 🔄 插件通信协议

### 从插件到 Web 应用

```typescript
// 博主数据采集
{
  type: 'COLLECT_BLOGGER',
  data: BloggerData,
  source: 'extension',
  timestamp: string
}

// 搜索记录
{
  type: 'SEARCH_KEYWORD',
  data: SearchData,
  source: 'extension',
  timestamp: string
}
```

### 从 Web 应用到插件

```typescript
// 响应消息
{
  type: 'PLUGIN_RESPONSE',
  success: boolean,
  data?: any,
  message?: string
}
```

## 🎨 界面预览

### Web 管理界面特性

- 📊 **仪表板**: 实时统计卡片、图表分析
- 👥 **博主管理**: 分页列表、搜索过滤、详情查看
- 🔍 **搜索记录**: 使用统计、频率分析
- ⚙️ **系统设置**: 参数配置、数据导出

### 经典界面特性

- 🎯 **简洁操作**: 一键搜索、快速采集
- 📝 **实时结果**: 即时显示操作结果
- 💡 **轻量级**: 最小资源占用

## 🚀 部署指南

### 开发环境

1. 克隆项目 → 安装依赖 → 启动服务
2. 加载插件 → 测试功能

### 生产环境

1. **Web 应用部署**:

   ```bash
   cd web-app
   npm run build
   # 部署到 Vercel/Netlify 等平台
   ```

2. **更新插件配置**:

   ```json
   // manifest.json
   "host_permissions": [
     "https://your-domain.vercel.app/*"
   ]
   ```

3. **更新 iframe 地址**:

   ```javascript
   // sidebar-web.html
   const WEB_APP_URL = 'https://your-domain.vercel.app';
   ```

## 🛡️ 安全性

- ✅ Content Security Policy 配置
- ✅ 跨域请求限制
- ✅ TypeScript 类型安全
- ✅ 输入验证和错误处理

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/新功能`
3. 提交更改: `git commit -m '添加某功能'`
4. 推送分支: `git push origin feature/新功能`
5. 提交 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙋‍♂️ 常见问题

### Q: Web 界面显示"连接失败"？

A: 确保 Next.js 应用正在运行 (`npm run dev`)

### Q: 插件无法采集数据？

A: 检查是否在小红书页面，确认插件权限设置

### Q: 如何切换界面模式？

A: 点击插件图标，在弹窗中选择对应界面

### Q: 数据丢失了怎么办？

A: 当前版本使用内存存储，重启后数据会重置。生产版本将集成持久化数据库。

---

**享受现代化的小红书数据管理体验！** 🎉
