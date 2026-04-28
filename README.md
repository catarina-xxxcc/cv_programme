# 小小求职拿下 ✦

> AI 驱动的简历解析工具 —— 上传简历，秒出 MBTI 人格、岗位推荐和简历诊断报告。

![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square) ![AI](https://img.shields.io/badge/AI-智谱%20GLM--4--Flash-blue?style=flat-square) ![Deploy](https://img.shields.io/badge/Deploy-Render%20%2B%20Vercel-black?style=flat-square)

---

## ✨ 功能特性

- 📄 **简历上传** — 支持 PDF / DOCX，拖拽或点击上传
- 🧠 **MBTI 推断** — 基于简历内容智能推断 16 型人格，附人格解读和特质标签
- 💼 **岗位推荐** — 结合简历技能和人格特质，推荐 6 个跨行业匹配岗位
- 🔍 **简历诊断** — 自动检测错别字、病句、语意冗杂，给出修改建议和综合评分

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python · FastAPI · PyMuPDF · python-docx |
| AI | 智谱 AI GLM-4-Flash（兼容 OpenAI 接口） |
| 前端 | 原生 HTML / CSS / JS（无框架） |
| 部署 | 后端 → Render · 前端 → Vercel |

---

## 🚀 本地运行

### 1. 安装依赖

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
ZHIPU_API_KEY=你的智谱API密钥
ZHIPU_MODEL=glm-4-flash
MAX_FILE_SIZE_MB=5
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:8000
```

> 智谱 API Key 在 [open.bigmodel.cn](https://open.bigmodel.cn) 注册后获取，GLM-4-Flash 有免费额度。

### 3. 启动服务

```bash
python main.py
```

服务地址：`http://127.0.0.1:8000`
前端演示页：`http://127.0.0.1:8000/demo`

---

## 🌐 接口说明

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 健康检查 |
| GET | `/demo` | 前端演示页 |
| POST | `/upload` | 上传简历（form-data，字段名 `file`） |

**POST /upload 返回示例：**

```json
{
  "filename": "resume.pdf",
  "parse_status": "success",
  "parsed_data": {
    "inferred_mbti": "ENTJ",
    "mbti_description": "天生领导者，擅长战略规划和团队管理",
    "candidate_summary": "具备数据分析与产品思维的金融科技人才",
    "job_recommendations": [
      {
        "title": "产品经理",
        "industry": "科技",
        "reason": "具备数据分析和跨部门协作能力",
        "match_level": "高"
      }
    ],
    "resume_diagnosis": {
      "overall_score": 92,
      "overall_comment": "简历结构清晰，表达专业",
      "typos": [],
      "grammar_issues": [],
      "redundancy": []
    }
  }
}
```

---

## ☁️ 部署指南

### 后端部署到 Render

1. 将项目推送到 GitHub
2. 在 [Render](https://render.com) 新建 Web Service，连接仓库
3. Render 会自动识别 `render.yaml` 配置
4. 在 Render 控制台 → Environment 添加环境变量：
   - `ZHIPU_API_KEY`：你的智谱 API Key
   - `ALLOWED_ORIGINS`：你的 Vercel 前端地址，例如 `https://your-app.vercel.app`

### 前端部署到 Vercel

1. 新建仓库，只上传 `frontend/` 目录内容
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. 修改 `frontend/config.js`，填入 Render 后端地址：

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://your-backend.onrender.com"
};
```

4. 推送后 Vercel 自动部署

> ⚠️ 每次 Vercel 生成新域名后，记得同步更新 Render 的 `ALLOWED_ORIGINS`，否则会出现 CORS 跨域错误。

---

## 📁 项目结构

```
.
├── backend/
│   └── main.py          # FastAPI 应用，AI 解析逻辑
├── frontend/
│   ├── index.html       # 前端页面
│   ├── config.js        # API 地址配置
│   └── vercel.json      # Vercel 部署配置
├── main.py              # 本地启动入口
├── requirements.txt     # Python 依赖
├── render.yaml          # Render 部署配置
└── .env                 # 本地环境变量（不提交到 Git）
```

---

## 🤝 团队协作建议

- 用 GitHub Organization 统一管理仓库
- Vercel / Render 项目给组员添加 Developer 权限
- 通过 Pull Request 协作，避免直接推送主分支
- 前后端分仓库管理，互不干扰
