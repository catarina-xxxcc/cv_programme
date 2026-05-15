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
from pydantic import BaseModel

load_dotenv()

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "5"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,https://catarina-xxxcc.github.io,https://cv-programme-git-main-catarina-xxxccs-projects.vercel.app,file://"
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
    allow_origins=["*"],  # 临时允许所有源，方便测试
    allow_methods=["*"],
    allow_headers=["*"],
)

zhipu_api_key = os.getenv("ZHIPU_API_KEY", "").strip()
if not zhipu_api_key:
    raise RuntimeError("Missing ZHIPU_API_KEY. Add it to your environment or .env file.")
client = OpenAI(api_key=zhipu_api_key, base_url=os.getenv("ZHIPU_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"))
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
        try:
            return json.loads(code_block_match.group(1))
        except json.JSONDecodeError:
            pass

    object_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if object_match:
        try:
            return json.loads(object_match.group(1))
        except json.JSONDecodeError:
            pass

    raise ValueError("AI response is not valid JSON")


def _parse_resume_with_ai(raw_text: str) -> dict[str, Any]:
    prompt = f"""你是资深HR分析师。请将简历解析为纯JSON（无markdown），字段如下：
{{
  "inferred_mbti": "16型人格之一",
  "mbti_description": "人格简短描述（≤60字）",
  "candidate_summary": "候选人简介（≤80字）",
  "city": "城市名称（如北京、上海），无则返回空字符串",
  "job_recommendations": [{{
    "title": "岗位名称",
    "industry": "行业（如：科技、金融、互联网）",
    "reason": "推荐理由（≤30字）",
    "match_level": "高或中",
    "match_score": 0-100整数,
    "missing_skills": ["缺失技能1", "缺失技能2"],
    "career_path": "成长路径（如：初级→中级→高级）",
    "salary_range": {{"min_salary": 15, "max_salary": 25, "city": "城市"}}
  }}],
  "resume_diagnosis": {{
    "typos": [{{"original": "原文片段", "suggestion": "正确写法"}}],
    "grammar_issues": [{{"original": "原句", "suggestion": "改进表达"}}],
    "redundancy": [{{"original": "冗余片段", "suggestion": "简化表达"}}],
    "overall_score": 1-100整数,
    "overall_comment": "一句话评价（≤30字）"
  }}
}}

【推断MBTI规则】软技能权重>技术栈：
- E判断：简历出现团队、领导、公开演讲、跨部门、协调等 → E；无以上信号且明确描述独立工作 → I
- N判断：战略、创新、系统设计、跨领域 → N；注重细节、流程执行 → S
- T判断：数据驱动、逻辑分析 → T；关注团队氛围、用户体验 → F
- J判断：项目管理、按时交付、结构化 → J；灵活应变、创意发散 → P

简历文本如下：
{raw_text}
"""
    response = client.chat.completions.create(
        model=ZHIPU_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return _to_json_with_fallback(response.choices[0].message.content)


def _score_resume_with_ai(raw_text: str, target_position: str, target_company: str = "", preferred_locations: list[str] | None = None) -> dict[str, Any]:
    company_context = f"\n【目标公司】{target_company}" if target_company.strip() else ""
    location_context = f"\n【期望工作地】{', '.join(preferred_locations)}" if preferred_locations else ""
    prompt = f"""你是一个资深 HR 分析师。请根据简历和目标岗位，对候选人进行六维度评分。
{company_context}{location_context}
【目标岗位】{target_position}

六维度评分标准（每项 1-5 分，步进 0.5）：

1. 学历背景匹配度：5分=硕士+985/211+专业对口；4分=普通本科+专业对口；3分=本科+专业不符；2分=大专；1分=学历明显不足
2. 实习经历匹配度：5分=同行业同岗≥2段或单段≥6月+有成果；4分=同行业相关岗或不同行业同岗；3分=有实习但关联一般；2分=无关实习；1分=无实习
3. 基础技能匹配度：5分=满足90%+核心技能+有精通项；4分=满足70%+核心技能；3分=满足约一半；2分=少量基础技能；1分=几乎无相关技能
4. 项目经验匹配度：5分=同类项目+可量化成果；4分=同类项目+有成果；3分=相关但成果一般；2分=项目少且不相关；1分=几乎无项目
5. 软素质匹配度：5分=多处具体事例体现高度匹配；4分=有明确事例；3分=体现一般；2分=较弱；1分=完全不匹配
6. 职业稳定性：5分=路径清晰连贯+每段≥6月+城市一致；4分=稳定+城市一致；3分=基本稳定；2分=多段短期或需跨省搬迁；1分=极度不稳定

【输出】严格纯 JSON（无 markdown），必须包含字段：validation_warnings[], candidate/education|experience|skills|projects|soft_skills|stability 各含score(0.5-5)和reason，position_requirements 同上结构，overall_match(0-100)，match_summary。

规则：
- score 只允许 0.5 步进（如 3.5、4.5），不要只给整数
- validation_warnings：检查岗位/公司/城市的逻辑一致性，不合理才警告，合理返回[]
- overall_match：基于候选人得分与岗位要求差距加权计算 0-100
- match_summary：一句话总结优势与不足
- 应届生无工作经验：stability 给 3 分
- 如指定目标公司（字节/腾讯/阿里/华为等头部大厂），岗位要求分数通常更高
- 严格 JSON 格式，不要 markdown 代码块

简历文本如下：
{raw_text}
"""
    response = client.chat.completions.create(
        model=ZHIPU_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return _to_json_with_fallback(response.choices[0].message.content)


def _add_default_values_for_new_fields(parsed_data: dict[str, Any]) -> dict[str, Any]:
    """
    为新增字段添加默认值（如果AI没有生成）
    保持向后兼容，不影响现有字段
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if "job_recommendations" in parsed_data and isinstance(parsed_data["job_recommendations"], list):
        for job in parsed_data["job_recommendations"]:
            if not isinstance(job, dict):
                continue
            
            # 添加match_score默认值（如果缺失）
            if "match_score" not in job:
                # 根据match_level推断默认分数
                if job.get("match_level") == "高":
                    job["match_score"] = 85
                elif job.get("match_level") == "中":
                    job["match_score"] = 70
                else:
                    job["match_score"] = 70
            else:
                # 验证范围
                if not isinstance(job["match_score"], int) or job["match_score"] < 0 or job["match_score"] > 100:
                    job["match_score"] = 70
            
            # 添加missing_skills默认值（如果缺失）
            if "missing_skills" not in job:
                job["missing_skills"] = []
            elif not isinstance(job["missing_skills"], list):
                job["missing_skills"] = []
            else:
                # 过滤并限制数量
                job["missing_skills"] = [
                    s for s in job["missing_skills"]
                    if isinstance(s, str) and s.strip()
                ][:5]
            
            # 添加career_path默认值（如果缺失）
            if "career_path" not in job:
                job["career_path"] = ""
            elif not isinstance(job["career_path"], str):
                job["career_path"] = ""
            else:
                job["career_path"] = job["career_path"][:100]
    
    return parsed_data


SYSTEM_PROMPT = """你是一个专业的求职顾问和简历写作专家。你的任务是通过友好的对话，帮助没有简历的用户生成一份专业的简历。

对话流程：
1. 先了解用户的基本情况：姓名、学历、专业、毕业院校
2. 了解工作经历或实习经历（如果是应届生则询问项目经历、社团经历）
3. 了解技能特长（编程语言、软件工具、语言能力等）
4. 了解求职意向（目标岗位、行业）
5. 信息收集完毕后，主动说"我已经收集了足够的信息，现在为你生成简历模板"，然后输出简历

输出简历时，使用以下 Markdown 格式，并在开头加上 [RESUME_TEMPLATE] 标记：

[RESUME_TEMPLATE]
# 姓名

📧 邮箱 | 📱 电话 | 🎓 学校

---

## 教育背景
**学校名称** · 专业 · 入学年份 - 毕业年份

---

## 技能
- 技能1、技能2、技能3

---

## 实习 / 工作经历
**公司名称** · 职位 · 时间段
- 主要职责或成果描述

---

## 项目经历
**项目名称** · 时间段
- 项目描述和个人贡献

---

## 自我评价
简短的自我介绍（2-3句话）

注意：
- 每次只问1-2个问题，不要一次问太多
- 语气友好自然，像朋友聊天一样
- 如果用户信息不完整，用合理的内容补充
- 简历内容要专业、简洁、有力"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ScorePosition(BaseModel):
    title: str
    company: str = ""
    locations: list[str] = []


class ScoreRequest(BaseModel):
    resume_text: str
    positions: list[ScorePosition] = []  # 支持多岗位对比


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@app.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})

        response = client.chat.completions.create(
            model=ZHIPU_MODEL,
            messages=messages,
        )
        reply = response.choices[0].message.content

        # 检测是否包含简历模板
        has_resume = "[RESUME_TEMPLATE]" in reply
        clean_reply = reply.replace("[RESUME_TEMPLATE]", "").strip()

        return {
            "reply": clean_reply,
            "has_resume": has_resume,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc
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
        # 为新增字段添加默认值（保持向后兼容）
        parsed = _add_default_values_for_new_fields(parsed)
        return {
            "filename": filename,
            "parse_status": "success",
            "parsed_data": parsed,
            "raw_text": raw_text,
            "message": "Resume parsed and structured successfully.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}") from exc


@app.post("/score")
async def score_resume(request: ScoreRequest) -> dict[str, Any]:
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")
    if not request.positions:
        raise HTTPException(status_code=400, detail="At least one position is required.")
    try:
        results = []
        for pos in request.positions:
            score_data = _score_resume_with_ai(
                request.resume_text,
                pos.title,
                pos.company,
                pos.locations if pos.locations else None,
            )
            results.append({
                "title": pos.title,
                "company": pos.company,
                "locations": pos.locations,
                **score_data,
            })
        return {
            "score_status": "success",
            "score_data": results if len(results) > 1 else results[0],
            "is_multi": len(results) > 1,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)