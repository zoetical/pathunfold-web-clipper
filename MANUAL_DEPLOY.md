# 手动部署指南

## 步骤 1: Vercel 登录和部署

### 1.1 登录 Vercel
```bash
cd backend
vercel login
```
选择你的登录方式（建议使用 GitHub）

### 1.2 部署到生产环境
```bash
vercel --prod --yes
```

### 1.3 设置环境变量
在 Vercel 仪表板或使用 CLI：
```bash
# 必需的环境变量
vercel env add CIRCLE_AUTH_TOKEN production

# 可选的环境变量（推荐设置）
vercel env add IFRAMELY_KEY production
vercel env add JWT_SECRET production
```

### 1.4 获取部署URL
部署完成后，Vercel 会提供一个 URL，类似：
`https://pathunfold-web-clipper-backend-xxx.vercel.app`

## 步骤 2: 测试后端

### 2.1 健康检查
```bash
curl https://your-backend-url.vercel.app/health
```

应该返回：
```json
{
  "status": "healthy",
  "timestamp": "...",
  "version": "2.0.0"
}
```

### 2.2 认证测试
```bash
curl -X POST https://your-backend-url.vercel.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "your-circle-email@example.com"}'
```

## 步骤 3: 更新扩展配置

### 3.1 更新默认后端URL
用你的实际后端URL替换以下文件中的URL：

**options.html (第168行)**:
```html
<input id="backendUrl" type="text" ... value="https://your-backend-url.vercel.app/api">
```

**options.js (第26行, 36行, 142行)**:
```javascript
// 将所有出现的 'https://pathunfold-web-clipper.vercel.app/api' 
// 替换为你的实际后端URL
```

### 3.2 更新版本号
**manifest.json**:
```json
{
  "version": "2.0"
}
```

## 步骤 4: 打包扩展

### 4.1 创建生产包
创建一个新的文件夹，复制以下文件：
- `manifest.json`
- `background.js`
- `content.js` 
- `popup.html`
- `popup.js`
- `options.html`
- `options.js`
- `icons/` 文件夹

### 4.2 压缩文件
将上述文件打包为 ZIP 文件：
`pathunfold-web-clipper-v2.0.zip`

## 步骤 5: 部署验证

### 5.1 本地测试
1. 在 Chrome 中加载未打包的扩展
2. 配置后端URL
3. 测试认证和剪藏功能

### 5.2 上传到 Chrome Web Store
1. 访问 Chrome Developer Dashboard
2. 上传 ZIP 文件
3. 填写应用信息
4. 提交审核

## 环境变量详细说明

### CIRCLE_AUTH_TOKEN (必需)
- 从 Circle 管理面板获取
- 路径: Settings → Developers → Headless API
- 格式: `circle_auth_xxxxxx`

### IFRAMELY_KEY (可选但推荐)
- 从 https://iframely.com 获取
- 提供丰富的链接预览功能
- 支持 1900+ 网站的嵌入

### JWT_SECRET (可选)
- 用于签名 JWT token
- 如不设置将使用默认值
- 生产环境建议设置强随机字符串

## 故障排除

### 后端部署失败
- 检查环境变量是否正确设置
- 验证 Circle token 有效性
- 查看 Vercel 函数日志

### 扩展认证失败
- 确认后端URL配置正确
- 测试后端健康检查端点
- 检查浏览器网络面板的错误信息

### 预览功能不工作
- 检查 IFRAMELY_KEY 是否设置
- 测试不同类型的URL
- 查看后端日志中的错误信息

## 成功部署后的验证清单

- [ ] 后端健康检查返回 200 状态
- [ ] 认证端点正常工作
- [ ] 预览端点返回数据
- [ ] 扩展可以成功登录
- [ ] 可以剪藏不同类型的内容
- [ ] 帖子在 Circle 中正确显示
- [ ] 错误处理工作正常
- [ ] 性能满足预期（响应时间 < 5秒）