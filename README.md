<div align="center">
  <img src="public/favicon.png" alt="谷雨开放API Logo" width="120" height="120">
  
  # 谷雨开放API
  
  高效、稳定的图像API服务，部署于边缘节点
  
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

---

## 简介

谷雨开放API是一个轻量级的图像API服务，基于边缘计算技术部署，提供快速、稳定的图像资源接口。目前主要提供必应每日一图API，更多API正在开发中。

## 功能特性

- **必应每日一图** - 获取必应搜索引擎每日更新的精美背景图片
- **边缘部署** - 基于腾讯云 EdgeOne 边缘计算，全球加速访问
- **跨域支持** - 完整的 CORS 支持，可在任何前端项目中使用
- **智能缓存** - 合理的缓存策略，减少请求延迟
- **简洁界面** - Apple 风格的现代化展示页面

## 项目结构

```
img-api/
├── public/
│   ├── index.html        # 前端展示页面
│   ├── style.css         # 页面样式文件
│   └── favicon.png       # 网站图标
├── functions/
│   └── bing/
│       └── index.js      # 必应每日一图 API
├── edgeone.json          # EdgeOne 配置文件
├── LICENSE               # MIT 开源许可证
└── README.md             # 项目说明文档
```

## 部署方式

本项目专为腾讯云 EdgeOne 边缘部署设计：

1. 将项目推送到 GitHub/GitLab
2. 在腾讯云 EdgeOne 控制台中连接仓库
3. 配置构建参数（无需额外构建步骤）
4. 部署完成后即可访问

## API 接口

### 必应每日一图

获取必应搜索引擎每日更新的高清背景图片。

**请求地址**
```
GET /bing
```

**响应格式**
- 类型: `image/*` (根据必应图片实际格式返回)
- 缓存: 10分钟 (`Cache-Control: max-age=600`)
- 跨域: 支持 (`Access-Control-Allow-Origin: *`)

**使用示例**

HTML:
```html
<img src="https://your-domain.com/bing" alt="必应每日一图">
```

JavaScript (Fetch API):
```javascript
fetch('/bing')
  .then(response => response.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    document.getElementById('img').src = url;
  });
```

CSS (背景图片):
```css
.hero-section {
  background-image: url('/bing');
  background-size: cover;
  background-position: center;
}
```

## 技术栈

| 技术 | 说明 |
|------|------|
| 前端 | HTML5, CSS3 (原生) |
| 边缘计算 | 腾讯云 EdgeOne Cloud Functions |
| API 交互 | Fetch API |
| 设计风格 | Apple 设计系统风格 |

## 配置说明

### edgeone.json

项目根目录的 `edgeone.json` 文件包含部署配置：

| 配置项 | 说明 |
|--------|------|
| `outputDirectory` | 静态资源输出目录 (`./public`) |
| `headers` | HTTP 响应头配置（安全头、缓存策略） |
| `rewrites` | URL 重写规则 (`/bing` → `/api/bing`) |
| `cloudFunctions` | 云函数配置，指定 `./functions` 目录 |

### 安全配置

项目默认配置了以下安全响应头：

- `X-Frame-Options: DENY` - 防止点击劫持
- `X-Content-Type-Options: nosniff` - 防止 MIME 类型嗅探

## 本地开发

1. 克隆仓库：
```bash
git clone https://github.com/mxlitey/img-api.git
cd img-api
```

2. 本地预览：
```bash
# 使用任意静态文件服务器，例如：
npx serve public
```

3. 访问 `http://localhost:3000` 查看效果

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

© 2025 谷雨. 保留所有权利。

---

<div align="center">
  
**[⬆ 返回顶部](#谷雨开放api)**

</div>
