# Vercel手动部署步骤

由于Vercel CLI需要交互式登录，请按照以下步骤手动部署：

## 1. 部署到Vercel

在终端中执行：

```bash
cd "/Users/tomin/Documents/Gemini CLI Projects/New Bite/pathunfold-web-clipper/backend"
vercel
```

按照提示：
- 选择登录方式（推荐GitHub）
- 如果是首次部署，选择"Create a new project"
- 项目名称可以设置为：`pathunfold-auth-backend`

## 2. 设置环境变量

部署完成后，需要设置环境变量：

### 方法一：通过Vercel Dashboard
1. 访问 [vercel.com](https://vercel.com)
2. 进入你的项目
3. 点击 "Settings" 标签
4. 选择 "Environment Variables"
5. 添加环境变量：
   - Name: `CIRCLE_AUTH_TOKEN`
   - Value: `kfzFcRPDDjFj6Pit5uWKW54qZcYbKFWt`
   - Environments: 选择 "Production", "Preview", "Development"
6. 点击 "Save"

### 方法二：通过Vercel CLI
```bash
cd "/Users/tomin/Documents/Gemini CLI Projects/New Bite/pathunfold-web-clipper/backend"
vercel env add CIRCLE_AUTH_TOKEN
```
然后选择所有环境（Production, Preview, Development）

## 3. 重新部署以应用环境变量

设置环境变量后，需要重新部署：

```bash
vercel --prod
```

## 4. 测试API

部署成功后，你会得到一个URL，类似：
`https://pathunfold-auth-backend-xxxxxxxx.vercel.app`

测试API是否工作：

```bash
curl -X POST https://你的项目名.vercel.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

如果成功，你会收到包含access_token的响应。

## 5. 更新Chrome插件

1. 打开Chrome插件
2. 右键点击插件图标 → 选项
3. 在Backend URL中输入：`https://你的项目名.vercel.app/api/auth`
4. 输入你的Circle邮箱
5. 点击"Authenticate"

现在你的PathUnfold Web Clipper应该可以正常工作了！