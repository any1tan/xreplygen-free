# XReplyGen Free

[中文](#中文) | [English](#english)

An open-source Chrome extension for drafting short, human-feeling replies inside X/Twitter. It is deliberately a **drafting** tool: it never posts, likes, follows, sends DMs, or clicks the final Reply/Post button for you.

Official product site: [xreplygen.any1tan.com](https://xreplygen.any1tan.com/)

## 中文

XReplyGen Free 是一款开源的 Chrome 扩展，帮助你在 X/Twitter 的回复和引用发布框里起草简短、更自然的评论。它只辅助起草，不会替你发帖、点赞、关注、发送私信，也不会点击最终的“回复”或“发布”按钮。

免费版采用 BYOK（自带 Key）模式。你可以选择任意支持 OpenAI 兼容 `chat/completions` 接口的 HTTPS API，填写自己的 API Key 和模型名称；生成请求会直接发送给你选择的服务商。

### 包含能力

- 支持 X/Twitter 的回复和引用发布框
- 每次生成一条可编辑草稿，并可用“换一条”获得新的角度
- 默认跟随帖子语言生成，也可在当前回复框内手动切换语言
- 六种语气预设和三档克制的“真人感”程度
- 可拖动的内嵌控制条，避免遮挡帖子正文
- 内置 Volcengine、DeepSeek、OpenAI 的配置预设
- 支持任意 HTTPS 的 OpenAI 兼容接口、Key 和模型名
- 自定义服务商按域名单独请求 Chrome 权限

### 有意不包含的内容

- 不含登录、订阅、支付、分析或追踪
- 不含托管模型 Key、平台代理生成接口或服务端账号数据
- 不含自动发帖或互动自动化
- 不含 XReplyGen Pro 的专有实现和生产环境配置

### 隐私

包括 API Key 在内的配置仅存储在你设备的 `chrome.storage.local` 中。点击“生成”后，可见的帖子上下文和你选择的选项会直接发送到你配置的 API 服务商。使用自定义服务商时，Chrome 只会在保存配置时请求该 API 域名的一次性权限。

使用前请自行阅读所选 API 服务商的隐私、数据保留和计费条款。

### 开发安装

```bash
npm install
npm run build
```

然后打开 `chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，并选择 `dist/` 目录。

### 配置模型服务

1. 打开 XReplyGen Free 的扩展弹窗。
2. 选择预设，或选择“任意 OpenAI 兼容 API”。
3. 填写 HTTPS Base URL、API Key 和模型名称。
4. 保存；若 Chrome 提示，确认该 API 域名的单次权限请求。
5. 打开 X/Twitter 的回复框，选择语气后生成草稿。

Base URL 可以是 API 根路径，例如 `https://api.example.com/v1`，也可以是完整的 `https://api.example.com/v1/chat/completions` 地址。仅当服务商提供 OpenAI 兼容端点时才可直接使用；请求格式不同的原生 API 不在支持范围内。

### 打包 ZIP

```bash
npm run package
```

可上传的 ZIP 会生成在 `release/` 目录。

### 公开发布检查

在公开推送或发布前运行：

```bash
npm run check:public
```

它会检查 Free 仓库中是否混入登录、权益、支付、第一方托管 API 或常见凭据文件。这是发布保护，不替代完整的安全审计。

### 许可证与名称

源代码采用 [MIT License](LICENSE)。关于 XReplyGen 名称和视觉标识的使用方式，请阅读 [TRADEMARKS.md](TRADEMARKS.md)。

### 安全问题

请通过 GitHub 的私密安全通告报告漏洞，详见 [SECURITY.md](SECURITY.md)。

## English

XReplyGen Free is BYOK. You choose any HTTPS API that supports the OpenAI-compatible `chat/completions` format, enter your own key and model name, and the extension sends generation requests directly to that provider.

### What is included

- X/Twitter reply and quote-post composer support
- One editable draft at a time, plus "Another one" for a fresh angle
- Language follows the post by default, with a per-composer override
- Six voice presets and three restrained human-feel levels
- A draggable inline control so it does not block the post text
- Built-in presets for Volcengine, DeepSeek, and OpenAI
- Any HTTPS OpenAI-compatible endpoint, key, and model name
- Per-host Chrome permission requests for custom providers

### What is intentionally not included

- No sign-in, subscription, billing, analytics, or tracking
- No hosted model key, managed-generation endpoint, or server-side account data
- No auto-posting or engagement automation
- No proprietary XReplyGen Pro implementation or production configuration

### Privacy model

Settings, including your provider API key, are stored in `chrome.storage.local` on your device. When you click Generate, the visible post context and your selected options are sent directly to the API provider you configured. For a custom provider, Chrome asks for permission only for that API host when you save it.

Review your provider's own privacy, retention, and billing terms before using its API.

### Install for development

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/`.

### Configure a provider

1. Open the XReplyGen Free popup.
2. Select a preset, or select **Any OpenAI-compatible API**.
3. Enter a plain HTTPS base URL, API key, and model name.
4. Save and approve the one-time host permission if Chrome asks.
5. Open an X/Twitter reply box, choose a tone, then generate a draft.

The base URL should be either the provider's API root such as `https://api.example.com/v1`, or its full `https://api.example.com/v1/chat/completions` URL. Native APIs with a different request format are not supported unless that provider exposes an OpenAI-compatible endpoint.

### Build a ZIP

```bash
npm run package
```

The uploadable package is created under `release/`.

### Public-release guard

Run this before publishing or pushing:

```bash
npm run check:public
```

It checks that this Free repository has no sign-in, entitlement, payment, first-party managed API, or common credential artifacts. It is a release guard, not a substitute for a full security review.

### License and name

The source code is available under the [MIT License](LICENSE). See [TRADEMARKS.md](TRADEMARKS.md) for use of the XReplyGen name and visual identity.

### Security

Please use a private GitHub security advisory for vulnerabilities. See [SECURITY.md](SECURITY.md).
