# Chrome插件测试指南

## 问题修复说明
我已经修复了以下问题：
1. 更新了manifest.json中的host_permissions以支持Vercel域名
2. 简化了background.js代码，添加了调试日志
3. 确保service worker正确加载

## 测试步骤

### 1. 重新加载插件
1. 打开 `chrome://extensions/`
2. 找到PathUnfold Web Clipper
3. 点击"重新加载"按钮（刷新图标）

### 2. 检查错误日志
1. 在扩展列表中点击"service worker"
2. 查看控制台是否有错误信息
3. 应该看到："PathUnfold Web Clipper background script loaded"

### 3. 重新配置插件
1. 点击插件图标
2. 点击设置链接
3. 输入你的Vercel API URL（格式：https://your-project.vercel.app/api/auth）
4. 输入你的Circle邮箱
5. 点击"Authenticate"

### 4. 测试发布功能
1. 访问任意网页
2. 选择一些文字
3. 点击插件图标
4. 确认内容已填充
5. 输入你的Circle Space ID
6. 点击"Post to Circle"

### 5. 查看调试信息
如果仍有问题：
1. 打开Chrome开发者工具（F12）
2. 进入Console标签
3. 重新尝试发布
4. 查看控制台日志

## 常见问题

### Q: 仍然显示代码而不是执行
A: 确保已重新加载插件，并且manifest.json格式正确

### Q: 认证失败
A: 检查Vercel后端是否已正确设置环境变量

### Q: 发布失败
A: 检查Space ID是否正确，确认你在该空间有发布权限

## 获取帮助
如果问题仍然存在，请检查：
1. Vercel部署是否成功
2. Circle API token是否有效
3. Space ID是否正确