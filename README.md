# 谷雨开放API

高效、稳定的图像API服务，部署于边缘节点。

## 项目结构

```
img-api/
├── index.html          # 前端展示页面
├── style.css           # 页面样式文件
├── favicon.png         # 网站图标
├── favicon.ico         # 网站图标(ICO格式)
└── functions/          # Cloudflare Pages Functions
    └── bing/
        └── index.js    # 必应每日一图 API
```

## 部署方式

本项目专为 Cloudflare Pages 边缘部署设计：

1. 将项目推送到 GitHub/GitLab
2. 在 Cloudflare Pages 中连接仓库
3. 构建配置留空（无需构建步骤）
4. 部署完成后即可访问

## API 接口

### 必应每日一图

**请求地址**
```
GET /bing
```

**响应格式**
- 返回必应每日一图的图片数据
- 支持跨域访问 (CORS)
- 缓存时间: 10分钟

**使用示例**
```html
<img src="https://your-domain.pages.dev/bing" alt="必应每日一图">
```

```javascript
fetch('/bing')
  .then(response => response.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    document.getElementById('img').src = url;
  });
```

## 技术栈

- **前端**: HTML5, CSS3 (原生)
- **边缘计算**: Cloudflare Pages Functions
- **样式**: Apple风格设计系统

## 许可证

© 2025 谷雨. 保留所有权利。
