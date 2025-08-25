# API调试指南

## 问题诊断

你遇到的 "Unexpected token '<'" 错误表明Circle API返回了HTML页面而不是JSON。这可能有几个原因：

### 1. API端点可能不正确

Circle的API端点可能有以下格式：
- `https://app.circle.so/api/v1/headless/posts` (当前使用的)
- `https://app.circle.so/api/headless/v1/posts` (另一种可能)
- 其他变体

### 2. 测试步骤

#### 方法一：使用测试页面
1. 在浏览器中打开 `test.html` 文件
2. 先测试认证（获取access token）
3. 再测试帖子创建
4. 查看详细的错误信息

#### 方法二：使用调试版本
1. 重命名 `background.js` 为 `background-backup.js`
2. 重命名 `background-debug.js` 为 `background.js`
3. 重新加载插件
4. 再次尝试发布
5. 查看控制台日志，它会尝试多个API端点

#### 方法三：手动测试
使用curl测试API：

```bash
# 测试认证
curl -X POST https://your-project.vercel.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'

# 测试创建帖子（替换TOKEN和SPACE_ID）
curl -X POST https://app.circle.so/api/v1/headless/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "space_id": "YOUR_SPACE_ID",
    "name": "Test Post",
    "body": "Test content",
    "post_type": "basic"
  }'
```

### 3. 可能的解决方案

1. **检查Circle API文档**
   - 确认正确的API端点URL
   - 检查是否需要额外的请求头

2. **验证Token权限**
   - 确保Headless token有创建帖子的权限
   - 检查token是否已过期

3. **检查Space ID**
   - 确认Space ID格式正确
   - 确保你在该空间有发布权限

### 4. 获取帮助

如果问题仍然存在：
1. 使用测试页面收集详细的错误信息
2. 检查Circle的管理后台是否有API相关的设置
3. 联系Circle支持确认API使用方式

## 下一步

1. 先使用test.html测试认证是否正常
2. 如果认证正常，测试帖子创建
3. 根据错误信息调整代码

记住：返回HTML通常意味着：
- URL错误（404页面）
- 认证失败（登录页面）
- 服务器错误（错误页面）