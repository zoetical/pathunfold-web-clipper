# Vercel GitHub部署指南

## 步骤1：在Vercel中导入GitHub仓库

1. **访问Vercel**
   - 打开 [vercel.com](https://vercel.com)
   - 登录你的账号

2. **创建新项目**
   - 点击 "New Project"
   - 在 "Import Git Repository" 部分
   - 找到并选择 `pathunfold-web-clipper`
   - 点击 "Import"

3. **配置项目**
   - Project Name: `pathunfold-auth-backend`（或你喜欢的名称）
   - Root Directory: `backend`（重要！）
   - Framework Preset: `Other`
   - Build Command: 留空
   - Output Directory: 留空
   - Install Command: `npm install`

4. **环境变量**
   - 展开 "Environment Variables" 部分
   - 添加：
     - Name: `CIRCLE_AUTH_TOKEN`
     - Value: `kfzFcRPDDjFj6Pit5uWKW54qZcYbKFWt`
     - Environment: 选择所有环境（Production, Preview, Development）

5. **部署**
   - 点击 "Deploy"
   - 等待部署完成

## 步骤2：获取API URL

部署成功后，你会得到一个URL，格式为：
`https://your-project-name.vercel.app/api/auth`

复制这个URL，下一步需要用到。

## 步骤3：更新Chrome插件

1. **打开Chrome扩展管理页**
   - 地址栏输入：`chrome://extensions/`
   - 找到PathUnfold Web Clipper
   - 点击"选项"

2. **配置插件**
   - Backend URL: 填入刚才复制的URL
   - Your Circle Email: 填入你的Circle邮箱
   - 点击"Authenticate"

3. **测试**
   - 访问任意网页
   - 选中一些内容
   - 点击插件图标
   - 填入Space ID
   - 点击"Post to Circle"

## 自动部署设置（可选）

如果你想要每次push代码时自动部署：

1. **在Vercel项目设置中**
   - 进入 "Settings" → "Git"
   - 确保 "Automatic Deployments" 已启用
   - 选择要自动部署的分支（通常是main）

2. **GitHub Actions（可选）**
   - 项目已包含 `.github/workflows/deploy.yml`
   - 你需要在Vercel中生成API token并添加到GitHub secrets

## 故障排除

### 1. 部署失败
- 确保Root Directory设置为`backend`
- 检查package.json是否正确

### 2. API返回404
- 确保访问的是`/api/auth`端点
- 检查vercel.json配置

### 3. 认证失败
- 确认CIRCLE_AUTH_TOKEN已正确设置
- 检查Circle后台的token是否有效

### 4. CORS错误
- API函数已包含CORS头
- 如果仍有问题，检查浏览器控制台

现在你的PathUnfold Web Clipper已经部署到Vercel并与GitHub连接了！