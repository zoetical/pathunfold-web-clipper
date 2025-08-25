# Vercel部署指南

## 部署步骤

### 方法一：使用Vercel CLI

1. **安装Vercel CLI**
```bash
npm i -g vercel
```

2. **登录Vercel**
```bash
vercel login
```

3. **部署项目**
```bash
cd backend
vercel
```

4. **配置环境变量**
在Vercel dashboard中设置环境变量：
- 变量名：`CIRCLE_AUTH_TOKEN`
- 值：从Circle.so后台获取的Headless Auth Token

### 方法二：通过GitHub部署

1. **推送代码到GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/pathunfold-auth-backend.git
git push -u origin main
```

2. **在Vercel中导入项目**
- 访问 [vercel.com](https://vercel.com)
- 点击 "New Project"
- 选择你的GitHub仓库
- 点击 "Import"

3. **配置环境变量**
在项目设置中：
- 进入 "Settings" → "Environment Variables"
- 添加：
  - Name: `CIRCLE_AUTH_TOKEN`
  - Value: `[你的Circle Headless Auth Token]`
- 点击 "Save"

### 获取Circle Headless Auth Token

1. 登录你的Circle.so管理后台
2. 进入 "Settings" → "Integrations"
3. 找到 "Headless Member API"
4. 生成或复制你的Auth Token

## 部署后

1. **获取API URL**
部署成功后，Vercel会给你一个URL，格式类似：
`https://your-project-name.vercel.app/api/auth`

2. **更新插件配置**
在Chrome插件的设置页面中：
- Backend URL填入：`https://your-project-name.vercel.app/api/auth`
- 保存后即可使用

## 测试API

使用curl测试API是否正常工作：

```bash
curl -X POST https://your-project-name.vercel.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

如果成功，你会收到包含access_token的JSON响应。

## 常见问题

### 1. CORS错误
如果遇到CORS错误，确保在API函数中设置了正确的CORS头。

### 2. 环境变量未设置
确保在Vercel dashboard中正确设置了`CIRCLE_AUTH_TOKEN`。

### 3. Circle API错误
检查你的Circle Auth Token是否有效，以及邮箱是否存在于Circle社区中。

### 4. 部署失败
检查package.json中的依赖是否正确，确保node-fetch版本兼容。

## 本地开发

要在本地测试Vercel函数：

1. 安装Vercel CLI
2. 在backend目录运行：
```bash
vercel dev
```

3. 设置本地环境变量：
```bash
vercel env add CIRCLE_AUTH_TOKEN
```

## 生产环境最佳实践

1. **监控**
- 在Vercel dashboard中监控函数执行情况
- 设置错误通知

2. **安全**
- 定期轮换Circle Auth Token
- 限制API访问频率（如果需要）

3. **日志**
- 检查Vercel日志排查问题
- 添加适当的错误日志记录