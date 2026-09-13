# 微信读书进度助手 (Reading Progress Helper)

> 在微信公众号 / 微信读书 / 小鹅通课程页上，实时显示当前阅读进度（已读百分比）。

一个轻量的 Edge 浏览器扩展（Manifest V3），只用 `activeTab` 权限，不收集任何数据。

## ✨ 功能特性

- **微信公众号文章**：滚动阅读时显示已读百分比
- **微信读书**：网页版阅读进度显示（横版阅读模式除外）
- **小鹅通课程页**：图文课程页阅读进度显示
- **零依赖、零权限滥用**：仅使用 `activeTab` 权限，代码全部在本地运行，无任何网络请求

## 📦 安装方式

1. 下载本仓库（`Code` → `Download ZIP`，或 `git clone`）
2. 打开 Edge，进入 `edge://extensions/`（Chrome 为 `chrome://extensions/`）
3. 打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本仓库文件夹
5. 打开公众号文章、微信读书或小鹅通课程页，即可看到阅读进度

## 🌐 支持的站点

| 站点 | 匹配规则 |
| --- | --- |
| 微信公众号 | `mp.weixin.qq.com` |
| 微信读书 | `weread.qq.com` |
| 小鹅通系列 | `*.xet.pomoho.com` / `*.xiaoe-tech.com` / `*.xiaoeknow.com` / `*.xeknow.com` |

## 🛠️ 技术实现

- **Manifest V3** Content Script，`document_end` 时机注入
- 使用 `requestAnimationFrame` 节流的滚动监听，计算内容区滚动比例
- 通过 `MutationObserver` 应对动态加载的内容
- 带版本标记（`v11`）的节点清理机制，避免旧版本残留元素冲突

## 📁 项目结构

```
阅读进度助手-v1.3.0/
├── manifest.json    # 扩展配置（MV3）
├── content.js       # 核心逻辑（各站点进度计算与 UI 注入）
└── icons/           # 扩展图标
```

## 📄 许可证

[MIT License](LICENSE)
