<div align="center">
  <img src="public/favicon.png" alt="谷雨开放API Logo" width="120" height="120">
  
  # 谷雨开放API
  
  高效、稳定的图像API服务，支持多平台边缘部署
  
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

---

## 简介

谷雨开放API是一个轻量级的图像API服务，基于边缘计算技术部署，提供快速、稳定的图像资源接口。支持 **Cloudflare Workers**、**腾讯云 EdgeOne Pages**、**阿里云 ESA Pages** 三大平台一键部署。

## 功能特性

- **必应每日一图** - 获取必应搜索引擎每日更新的精美背景图片
- **多平台支持** - 支持 Cloudflare、腾讯云 EdgeOne、阿里云 ESA 三平台部署
- **边缘缓存** - 利用 Cache API 实现边缘节点缓存，减少延迟
- **请求超时控制** - 8秒超时保护，防止边缘函数执行超限
- **跨域支持** - 完整的 CORS 支持，含 OPTIONS 预检请求处理
- **安全响应头** - X-Frame-Options、X-Content-Type-Options 等安全配置
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
│       └── index.js      # 统一边缘函数（三平台兼容）
├── wrangler.toml         # Cloudflare Workers 配置
├── edgeone.json          # 腾讯云 EdgeOne 配置
├── esa.jsonc             # 阿里云 ESA 配置
├── LICENSE               # MIT 开源许可证
└── README.md             # 项目说明文档
```

## 多平台部署

### 平台配置文件

| 平台 | 配置文件 | 文档 |
|------|----------|------|
| Cloudflare Workers | `wrangler.toml` | [Workers 文档](https://developers.cloudflare.com/workers/) |
| 腾讯云 EdgeOne Pages | `edgeone.json` | [EdgeOne 文档](https://cloud.tencent.com/document/product/1552) |
| 阿里云 ESA Pages | `esa.jsonc` | [ESA 文档](https://help.aliyun.com/zh/edge-security-acceleration/esa/) |

### Cloudflare Workers 部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 本地开发测试
wrangler dev --port 8787

# 部署到生产环境
wrangler deploy
```

### 腾讯云 EdgeOne Pages 部署

1. 将项目推送到 GitHub 仓库
2. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
3. 选择 **边缘函数 > Pages**，点击创建
4. 导入 GitHub 仓库，EdgeOne 会自动读取 `edgeone.json` 配置
5. 点击 **开始部署**

### 阿里云 ESA Pages 部署

1. 将项目推送到 GitHub 仓库
2. 登录 [ESA 控制台](https://esa.console.aliyun.com/)
3. 选择 **边缘计算 > 函数和Pages**
4. 点击 **创建**，选择 **导入 Github 仓库**
5. 授权并选择仓库，ESA 会自动读取 `esa.jsonc` 配置
6. 点击 **开始部署**

## API 接口

### 必应每日一图

获取必应搜索引擎每日更新的高清背景图片。

**请求地址**
```
GET /bing
```

**请求方法**
| 方法 | 说明 |
|------|------|
| `GET` | 获取图片（返回完整响应体） |
| `HEAD` | 获取图片元数据（无响应体） |
| `OPTIONS` | CORS 预检请求 |

**响应头**

| 响应头 | 说明 |
|--------|------|
| `Content-Type` | 图片 MIME 类型（如 `image/jpeg`） |
| `Cache-Control` | `public, max-age=600, s-maxage=600` |
| `X-Cache-Status` | 缓存状态：`HIT`（命中）或 `MISS`（未命中） |
| `Access-Control-Allow-Origin` | `*` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |

**错误响应**

| 状态码 | 说明 |
|--------|------|
| `405` | 请求方法不被允许 |
| `404` | 未找到图片信息 |
| `500` | 服务器内部错误 |
| `502` | 上游服务错误 |

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
| 边缘计算 | Cloudflare Workers / 腾讯云 EdgeOne / 阿里云 ESA |
| 运行时 | V8 Isolate (Edge Runtime) |
| API 交互 | Fetch API |
| 设计风格 | Apple 设计系统风格 |

## 本地开发

### 前端预览

```bash
# 使用任意静态文件服务器
npx serve public
```

### Cloudflare Workers 本地调试

```bash
# 安装依赖
npm install -g wrangler

# 启动本地开发服务器
wrangler dev --port 8787

# 访问 http://127.0.0.1:8787/bing 测试 API
```

## 配置说明

### wrangler.toml (Cloudflare)

| 配置项 | 说明 |
|--------|------|
| `name` | Worker 名称 |
| `main` | 入口文件路径 |
| `compatibility_date` | 兼容性日期 |
| `[vars]` | 环境变量 |

### edgeone.json (腾讯云)

| 配置项 | 说明 |
|--------|------|
| `outputDirectory` | 静态资源输出目录 |
| `headers` | HTTP 响应头配置 |
| `rewrites` | URL 重写规则 |
| `cloudFunctions` | 云函数配置 |

### esa.jsonc (阿里云)

| 配置项 | 说明 |
|--------|------|
| `name` | 项目名称 |
| `entry` | 边缘函数入口文件 |
| `assets.directory` | 静态资源目录 |
| `assets.notFoundStrategy` | 404 处理策略 |

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
