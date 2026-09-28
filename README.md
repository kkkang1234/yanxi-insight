# 言析 Insight

面向工作场景的用户访谈研究工作台。它帮助研究员、产品经理与设计师从访谈准备、材料整理、跨受访者分析走到证据核对和洞察报告导出。

- 在线体验：[yanxi-insight-portfolio.piaoyxyeah.chatgpt.site](https://yanxi-insight-portfolio.piaoyxyeah.chatgpt.site)
- 产品需求文档：[docs/言析Insight_MVP_PRD.md](docs/言析Insight_MVP_PRD.md)
- 验收记录：[docs/验收记录.md](docs/验收记录.md)

## 使用流程
1. 新建项目，整理背景、目标、对象及研究问题，可上传或粘贴访谈大纲。
2. 导入 Word（DOCX）/ TXT / MD 或粘贴访谈，填写受访者编号；同人多份使用同一编号。
3. 按主题、阶段和问题查看发现，右侧逐人核对证据并定位全文。访谈记录按大纲问题整理，分析页集中填写需求与痛点。
4. 编辑并确认洞察，下载 Markdown 报告。未确认或引用失效的内容不能进入正式报告。

侧栏为历史项目，内容区保留四步导航。项目自动保存在当前浏览器；没有项目备份功能或跨设备同步。

## 本地运行
需要 Node.js 22.13 以上版本，建议使用较新版本。在本目录执行：

```sh
npm run install:ci
npm run dev
```

默认地址 http://localhost:5173 。使用 npm run build 构建，npm run start 本地预览构建产物。本项目基于 React、TypeScript、Vinext 与 Cloudflare Worker，不需要初始化数据库。

## DeepSeek 接入
已实现服务端接入，但尚无真实密钥，真实调用未验收。编码平台能调用模型，不等于应用自动取得模型接口。

1. 复制 .dev.vars.example 为本目录 .dev.vars。
2. 在本机编辑器中填写 INSIGHT_MODEL_KEY，或只填写 DEEPSEEK_API_KEY。不要在聊天、浏览器或源码中保存密钥。
3. 默认 URL 为 https://api.deepseek.com/chat/completions，模型为 deepseek-flash；INSIGHT_MODEL_NAME 可调整为账号可用模型。
4. 重启预览，以合成或脱敏材料验证整理研究信息、开始分析、生成洞察草稿、引用核对与报告下载。

本地通过 Cloudflare 环境绑定读取 .dev.vars，仅创建 .env 不保证生效。迁移其他平台时须适配服务端环境读取；前端仍调用 /api/ai。部署使用服务端 Secrets 注入凭证。

官方参考：[接口说明](https://api-docs.deepseek.com/)、[JSON 模式](https://api-docs.deepseek.com/guides/json_mode/)。有效密钥、可用额度和网络是接入条件，输出质量仍需验收。调用时相关研究资料会发送到所配置的模型服务。

## 测试
```sh
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test-isolation=none --test tests/research.test.mjs
node --import tsx --test-isolation=none --test tests/model.test.mjs
node --experimental-strip-types --test-isolation=none --test tests/http.test.mjs
npm run build
```

HTTP 测试要求默认端口服务启动且未配置模型；不会调用外部模型。模型流程测试使用模拟响应，不能替代真实调用验收。tsx 由当前锁定依赖树提供。详见 docs/验收记录.md。

## 当前边界
- 最多 5 份访谈，单份 20,000 字符，总计 60,000 字符；支持 UTF-8 TXT / MD，可解析 DOCX 正文，不直接解析旧 DOC、音频或 PDF。
- 浏览器支持语音识别时显示口述入口，否则使用文字。
- 引文校验能证明原话存在，不能保证语义解释正确，需要人工核对。
- 清除浏览器站点数据会影响历史项目；尚无多用户协作。
- 当前为本地应用；公开部署前需补充访问控制、调用限流及适合实际数据的持久化方案。
- 分享源码不得携带 .dev.vars、.env、.wrangler、.sites-runtime、浏览器数据、真实访谈和密钥。

