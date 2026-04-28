import io
import json
import os
import re
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
from openai import OpenAI
from docx import Document
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

load_dotenv()

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "5"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",") if origin.strip()]
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
FRONTEND_DEMO_PATH = Path(__file__).resolve().parent.parent / "frontend" / "index.html"

app = FastAPI(title="小小求职拿下！- AI 简历解析与 MBTI 引擎")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

google_api_key = os.getenv("ZHIPU_API_KEY", "").strip()
if not google_api_key:
    raise RuntimeError("Missing ZHIPU_API_KEY. Add it to your environment or .env file.")
client = OpenAI(api_key=google_api_key, base_url="https://open.bigmodel.cn/api/paas/v4/")
ZHIPU_MODEL = os.getenv("ZHIPU_MODEL", "glm-4-flash")


def _file_extension(filename: str) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def _extract_text(content_type: str, file_bytes: bytes) -> str:
    raw_text = ""
    if content_type == "application/pdf":
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                raw_text += page.get_text()
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = Document(io.BytesIO(file_bytes))
        raw_text = "\n".join(para.text for para in doc.paragraphs)
    return raw_text.strip()


def _to_json_with_fallback(response_text: str) -> dict[str, Any]:
    cleaned = response_text.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    code_block_match = re.search(r"```json\s*(\{.*\})\s*```", cleaned, re.DOTALL)
    if code_block_match:
        return json.loads(code_block_match.group(1))

    object_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if object_match:
        return json.loads(object_match.group(1))

    raise ValueError("AI response is not valid JSON")


def _parse_resume_with_ai(raw_text: str) -> dict[str, Any]:
    prompt = f"""
你是一个资深 HR 分析师和职业人格专家。请将简历解析为严格 JSON（不要使用 markdown 代码块）。
输出字段要求：
1) inferred_mbti: 字符串，16型人格之一
2) skills: 字符串数组
3) work_experience: 对象数组，每项包含 company, role, period, highlights(数组)
4) projects: 对象数组，每项包含 name, role, summary, tech_stack(数组)
5) education: 对象数组，每项包含 school, degree, period
6) candidate_summary: 字符串，简短总结（100字以内）

如果信息缺失，请使用空字符串或空数组，不要省略字段。

推断 inferred_mbti 时，请严格遵守以下规则，软技能描述的权重高于技术栈：

E vs I（外向 vs 内向）：
- E 的强信号：提到团队合作、公开演讲、领导力、组织活动、社团负责人、跨部门协作、客户沟通、培训他人
- I 的强信号：独立研究、专注深度技术、无任何团队/沟通相关描述

S vs N（实感 vs 直觉）：
- N 的强信号：战略规划、创新、系统设计、跨领域思维、提出新方案
- S 的强信号：注重细节、流程执行、数据记录、操作规范

T vs F（思考 vs 情感）：
- F 的强信号：关注团队氛围、帮助他人、志愿服务、用户体验、人文关怀
- T 的强信号：数据驱动、逻辑分析、优化效率、技术决策

J vs P（判断 vs 感知）：
- J 的强信号：项目管理、按时交付、制定计划、结构化工作方式
- P 的强信号：灵活应变、多线并行、探索性项目、创意发散

简历文本如下：
{raw_text}
"""
    response = client.chat.completions.create(
        model=ZHIPU_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return _to_json_with_fallback(response.choices[0].message.content)


@app.get("/")
async def health_check() -> dict[str, str]:
    return {"message": "Resume AI API is ready."}


@app.get("/demo")
async def demo_page() -> FileResponse:
    if not FRONTEND_DEMO_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo page not found.")
    return FileResponse(FRONTEND_DEMO_PATH)


@app.post("/upload")
async def upload_resume(file: UploadFile = File(...)) -> dict[str, Any]:
    content_type = file.content_type or ""
    filename = file.filename or ""
    ext = _file_extension(filename)

    if content_type not in ALLOWED_MIME_TYPES or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX resumes are supported.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max allowed size is {MAX_FILE_SIZE_MB}MB.",
        )

    try:
        raw_text = _extract_text(content_type, file_bytes)
        if not raw_text:
            raise HTTPException(status_code=400, detail="No readable text found in the uploaded file.")

        parsed = _parse_resume_with_ai(raw_text)
        return {
            "filename": filename,
            "parse_status": "success",
            "parsed_data": parsed,
            "message": "Resume parsed and structured successfully.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)