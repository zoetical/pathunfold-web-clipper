# 🚀 PathUnfold Web Clipper - 自动部署脚本

## 💡 解决方案

现在你有了一个**自动化脚本**，每次重新部署时会自动更新前端的backend URL，无需手动输入！

## 📁 文件说明

- `update-backend-url.sh` - 自动化部署和URL更新脚本
- `pathunfold-web-clipper-v2.0.0-20250826-193957.zip` - 最新扩展包

## 🎯 使用方法

### 一键自动部署
```bash
./update-backend-url.sh
```

### 脚本功能
1. ✅ **自动部署后端**到Vercel生产环境
2. ✅ **提取新的backend URL**
3. ✅ **自动更新**所有前端文件 (options.html, options.js, popup.js)
4. ✅ **生成带时间戳的扩展包**
5. ✅ **清理备份文件**

### 输出示例
```
🎉 Auto-update completed successfully!
==================================
📦 New backend URL: https://pathunfold-web-clipper-backend-6rosuwyhg-mins-projects-ac9e45c3.vercel.app/api
📱 Extension package: pathunfold-web-clipper-v2.0.0-20250826-193957.zip
```

## 📋 用户体验

**之前：**
1. 手动部署后端
2. 复制新的URL
3. 手动更新前端配置
4. 手动输入backend URL
5. 重新打包扩展

**现在：**
1. 运行 `./update-backend-url.sh`
2. 加载生成的扩展包
3. ✨ **backend URL自动设置为最新** ✨

## 🔧 技术细节

- **正则表达式**提取Vercel URL: `https://[a-zA-Z0-9-]*\.vercel\.app`
- **批量替换**所有frontend文件中的backend URL
- **时间戳命名**避免扩展包冲突
- **自动清理**备份文件

## 🎉 用户完全无需手动输入backend URL了！

每次部署后，扩展会自动使用最新的backend URL！