# 小红书助手部署指南

## 🚀 快速部署

### 1. 启动 Next.js Web 应用

```bash
# 进入 web 应用目录
cd web-app

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

服务器将在 <http://localhost:3000> 启动

### 2. 安装浏览器插件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择项目根目录 (`xhs-extends`)
6. 插件安装成功后会显示在工具栏

## 🎯 使用方法

### 直接使用 SidePanel

1. **确保 Next.js 应用正在运行** (`npm run dev`)
2. **点击插件图标** - 小红书助手会直接在右侧打开 SidePanel
3. **等待加载** - Web 应用会在 iframe 中加载
4. **开始使用** - 享受现代化的数据管理界面！

### SidePanel 的优势

- ✅ **固定位置**：始终在浏览器右侧
- ✅ **与页面并排**：不遮挡页面内容
- ✅ **现代体验**：类似开发者工具的专业界面
- ✅ **无干扰**：不会被页面刷新影响

## 🔧 配置说明

### manifest.json 配置

```json
{
  "side_panel": {
    "default_path": "sidebar-web.html"
  },
  "host_permissions": [
    "https://www.xiaohongshu.com/*",
    "http://localhost:3000/*",
    "https://*.vercel.app/*"
  ]
}
```

### sidebar-web.html 功能

- 🔄 **自动重连**：检测 Web 服务状态，自动重试
- 📡 **实时通信**：插件与 Web 应用双向消息传递
- 🛡️ **错误处理**：友好的错误提示和恢复机制
- 📊 **状态显示**：连接状态实时反馈

## 🌐 生产部署

### Web 应用部署

1. **构建应用**：

   ```bash
   cd web-app
   npm run build
   ```

2. **部署到云平台**：
   - **Vercel**：`vercel deploy`
   - **Netlify**：拖拽 `.next` 文件夹
   - **其他平台**：上传构建文件

3. **更新配置**：

   ```javascript
   // sidebar-web.html
   const WEB_APP_URL = 'https://your-app.vercel.app';
   ```

   ```json
   // manifest.json
   "host_permissions": [
     "https://your-app.vercel.app/*"
   ]
   ```

### 插件发布

1. **打包插件**：

   ```bash
   zip -r xhs-extends.zip . -x "web-app/*" "node_modules/*" ".git/*"
   ```

2. **Chrome Web Store**：
   - 访问 [Chrome Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - 上传 ZIP 文件
   - 填写商店信息
   - 提交审核

## 🔍 测试检查

### Web 应用测试

1. 访问 <http://localhost:3000>
2. 检查界面是否正常显示
3. 测试 API 接口：

   ```bash
   curl http://localhost:3000/api/stats?type=overview
   ```

### 插件测试

1. 在 `chrome://extensions/` 检查插件状态
2. 点击插件图标，确认 SidePanel 打开
3. 检查 iframe 是否加载 Web 应用
4. 在小红书页面测试数据采集功能

### 集成测试

1. 在小红书页面打开插件
2. 使用 Web 界面的快速操作功能
3. 检查数据是否同步更新
4. 验证插件与 Web 应用的通信

## 🛠️ 故障排除

### 常见问题

**Q: SidePanel 显示"连接失败"？**

```bash
# 检查 Next.js 应用是否运行
cd web-app && npm run dev

# 检查端口是否被占用
netstat -an | grep 3000
```

**Q: 插件无法加载？**

1. 确认开发者模式已开启
2. 检查 manifest.json 语法
3. 查看 Chrome 扩展管理页面的错误信息

**Q: iframe 无法加载？**

1. 检查 CSP 配置
2. 确认 host_permissions 设置
3. 查看浏览器控制台错误

**Q: 数据不同步？**

1. 检查 postMessage 通信
2. 确认消息监听器正常工作
3. 查看插件后台脚本日志

### 调试工具

1. **Chrome DevTools**：
   - 右键 SidePanel → "检查"
   - 查看 Console 和 Network 面板

2. **插件调试**：
   - 访问 `chrome://extensions/`
   - 点击"背景页"或"Service Worker"
   - 查看后台脚本日志

3. **API 调试**：

   ```bash
   # 测试 API 响应
   curl -X GET http://localhost:3000/api/bloggers
   curl -X POST http://localhost:3000/api/search \
     -H "Content-Type: application/json" \
     -d '{"keyword":"测试"}'
   ```

## 📈 性能优化

### Web 应用优化

- 启用 Next.js 图片优化
- 使用 CDN 加速静态资源
- 配置适当的缓存策略
- 压缩 API 响应

### 插件优化

- 最小化后台脚本运行时间
- 使用延迟加载减少初始化时间
- 优化 iframe 加载性能
- 减少不必要的消息传递

## 🔐 安全考虑

- 验证 iframe 来源
- 限制 host_permissions 范围
- 使用 HTTPS 进行生产部署
- 实施适当的 CSP 策略

---

**享受现代化的小红书数据管理体验！** 🎉
