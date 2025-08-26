# 🚀 PathUnfold Web Clipper v2 - 生产部署指南

## 📋 部署前检查清单

### ✅ 必需准备项目
- [ ] Circle.so 管理员权限和 Headless Auth Token
- [ ] Vercel 账户（免费版本即可）
- [ ] Iframely API Key（可选但推荐）
- [ ] Chrome Developer Dashboard 账户（用于发布）
- [ ] Node.js 18+ 和 npm 已安装
- [ ] Vercel CLI 已安装 (`npm install -g vercel`)

### ✅ 项目文件验证
所有必需文件已准备就绪：
- ✅ 后端 API 端点 (`backend/api/`)
- ✅ 核心库文件 (`backend/lib/`)
- ✅ 扩展前端文件
- ✅ 部署配置文件
- ✅ 文档和测试脚本

---

## 🎯 快速部署步骤

### 第一步：后端部署到 Vercel

1. **登录 Vercel**
   ```bash
   cd backend
   vercel login
   ```

2. **部署到生产环境**
   ```bash
   vercel --prod --yes
   ```

3. **设置环境变量**
   在 Vercel Dashboard 中设置：
   - `CIRCLE_AUTH_TOKEN` (必需)
   - `IFRAMELY_KEY` (推荐)
   - `JWT_SECRET` (推荐)

4. **测试后端**
   ```bash
   curl https://your-backend-url.vercel.app/health
   ```

### 第二步：打包扩展程序

1. **使用打包脚本**
   ```bash
   # 在项目根目录执行
   ./package.sh https://your-backend-url.vercel.app/api
   ```

2. **验证包内容**
   - 检查 ZIP 文件是否包含所有必需文件
   - 确认后端URL已正确更新

### 第三步：测试和发布

1. **本地测试**
   - 在 Chrome 中加载未打包的扩展
   - 测试认证、预览、发帖功能

2. **上传到 Chrome Web Store**
   - 登录 Chrome Developer Dashboard  
   - 上传 ZIP 包
   - 填写商店信息
   - 提交审核

---

## 🔧 详细配置说明

### 环境变量配置

#### CIRCLE_AUTH_TOKEN (必需)
```
获取路径: Circle Admin → Settings → Developers → Headless API
格式: circle_auth_xxxxxxxxxxxxxxxxxx
用途: 用户认证和帖子创建
```

#### IFRAMELY_KEY (推荐)
```
获取地址: https://iframely.com/
用途: 1900+ 网站的富预览支持
回退方案: 无此key时使用基础预览
```

#### JWT_SECRET (推荐)  
```
建议值: 至少32位随机字符串
用途: JWT会话token签名
默认值: 系统自动生成
```

### Vercel 项目配置

**运行时配置:**
- Node.js 版本: 20.x
- 区域: iad1 (美东), hnd1 (日本)
- 超时: 30秒
- 内存: 默认 (1024MB)

**安全头配置:**
- CORS: 已配置
- CSP: 已配置
- 安全头: 已启用

---

## 🧪 测试验证步骤

### 后端API测试

1. **健康检查**
   ```bash
   curl https://your-backend.vercel.app/health
   # 预期: {"status":"healthy",...}
   ```

2. **认证测试**  
   ```bash
   curl -X POST https://your-backend.vercel.app/api/auth \
     -H "Content-Type: application/json" \
     -d '{"email":"your-circle-email@example.com"}'
   # 预期: {"session_token":"eyJ...",...}
   ```

3. **预览测试**
   ```bash
   curl "https://your-backend.vercel.app/api/preview?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   # 预期: {"success":true,"preview":{...}}
   ```

### 扩展功能测试

1. **认证流程**
   - [ ] 设置页面可以正确认证
   - [ ] JWT token 正确保存
   - [ ] 登出功能正常

2. **内容剪藏**
   - [ ] 文本选择和剪藏
   - [ ] 图片检测和处理
   - [ ] 视频链接预览
   - [ ] YouTube/Vimeo 特殊处理

3. **预览功能**
   - [ ] 缩略图正确显示
   - [ ] 元数据标签显示
   - [ ] 实时内容预览更新

4. **发布到 Circle**
   - [ ] 帖子成功创建
   - [ ] TipTap JSON 格式正确
   - [ ] 媒体内容正确嵌入

---

## 📊 性能监控指标

### 关键指标
- **响应时间**: 认证 <2s, 预览 <3s, 发帖 <5s
- **成功率**: >95% API 请求成功
- **缓存命中率**: 预览缓存 >60%
- **错误率**: <5% 用户遇到错误

### 监控设置
1. Vercel Analytics 自动监控
2. 手动日志检查: Vercel Dashboard → Functions → Logs
3. 用户反馈收集

---

## 🐛 常见问题解决

### 部署失败
```bash
# 检查环境变量
vercel env ls

# 查看部署日志  
vercel logs

# 重新部署
vercel --prod --force
```

### 认证问题
- 验证 CIRCLE_AUTH_TOKEN 有效性
- 检查 Circle 社区成员权限
- 确认邮箱拼写正确

### 预览不显示
- 检查 IFRAMELY_KEY 设置
- 测试不同类型URL
- 查看浏览器网络面板错误

### CORS 错误
- 确认 vercel.json 配置正确
- 检查请求头设置
- 验证域名配置

---

## 📈 上线后维护

### 定期检查项目
- [ ] 每周检查后端健康状态
- [ ] 月度性能指标审查
- [ ] 季度依赖更新检查

### 用户反馈处理
- Chrome Web Store 评论监控
- 错误日志分析  
- 功能改进规划

### 版本更新流程
1. 开发环境测试
2. 预览环境验证
3. 生产环境部署  
4. 扩展包更新
5. Chrome Store 发布

---

## 🎉 部署完成验证

### 最终检查清单
- [ ] 后端健康检查返回正常
- [ ] 所有API端点响应正确
- [ ] 扩展认证功能正常
- [ ] 内容剪藏功能正常
- [ ] 预览功能正常显示
- [ ] Circle 帖子创建成功
- [ ] 错误处理工作正常
- [ ] 性能指标满足要求

### 成功标志
✅ **后端**: Vercel 部署成功，健康检查通过  
✅ **扩展**: Chrome 中正常加载，所有功能可用  
✅ **集成**: 与 Circle 平台完美协作  
✅ **用户体验**: 流畅的剪藏到发布流程  

---

## 📞 支持联系

如遇到部署问题，请：
1. 检查本指南的故障排除部分
2. 查看 Vercel 和 Chrome 控制台日志
3. 参考项目文档 (README.md, TESTING.md)
4. 创建 GitHub Issue 寻求帮助

**🚀 恭喜！PathUnfold Web Clipper v2 现已准备好投入生产使用！**