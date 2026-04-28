<<<<<<< HEAD
# 小小求职拿下 - Demo1

这是一个端到端演示版，支持：
- 上传 PDF / DOCX 简历
- 提取文本
- 调用 Gemini 输出结构化简历和 MBTI 推断
- 内置最小前端演示页（拖拽上传 + 结果展示）

## 本地运行（开发）

### 1) 安装依赖

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2) 配置环境变量

```bash
cp .env.example .env
```

然后在 `.env` 中填入你的 `GOOGLE_API_KEY`。

### 3) 运行服务

```bash
python main.py
```

服务地址：`http://127.0.0.1:8000`

### 4) 本地前端演示页

打开：`http://127.0.0.1:8000/demo`

## 主要接口

- `GET /`：健康检查
- `GET /demo`：前端演示页
- `POST /upload`：上传简历文件（form-data 字段名：`file`）

## 公网部署（GitHub + Vercel + Render）

推荐分成两个仓库：
- 前端仓库：`frontend/`
- 后端仓库：项目根目录（含 `backend/`, `requirements.txt`, `render.yaml`）

### A. 部署后端到 Render

1. 把项目推到 GitHub（后端仓库）
2. 在 Render 新建 Web Service，连接仓库
3. 使用仓库内 `render.yaml`（Blueprint）自动识别配置
4. 在 Render 控制台补全环境变量：
   - `GOOGLE_API_KEY`：你的 Gemini key
   - `ALLOWED_ORIGINS`：你的前端域名（例如 `https://your-app.vercel.app`）
5. 部署完成后记录后端地址，例如：
   - `https://your-backend.onrender.com`

### B. 部署前端到 Vercel

1. 新建前端仓库，只上传 `frontend/` 目录内容
2. 在 Vercel 导入该仓库并部署
3. 部署前，把 `frontend/config.js` 中 `API_BASE_URL` 改成 Render 地址：

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://your-backend.onrender.com"
};
```

4. 重新部署 Vercel，打开前端地址验证上传

### C. 团队协作建议

- 用 GitHub Organization 管理仓库
- Vercel/Render 项目给组员添加 Developer 权限
- 用 Pull Request 流程协作，避免直接改主分支
=======
# cv_programme
>>>>>>> 747874aa38e5962162f41cfee66fd893ef2bfe80
