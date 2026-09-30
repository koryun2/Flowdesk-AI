import logging
import time
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .agent import plan_message
from .classifier import build_analysis
from .config import get_settings
from .knowledge import EMBEDDING_DIMENSIONS, answer_question, embed_texts
from .schemas import TicketAnalysis, TicketAnalysisRequest


settings = get_settings()
logger = logging.getLogger("flowdesk.ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI orchestration service for Flowdesk. This service returns structured results and does not write application tables.",
)


@app.middleware("http")
async def log_requests(request, call_next):
    started = time.perf_counter()
    request_id = (request.headers.get("x-request-id") or "")[:64] or uuid4().hex[:12]
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "%s %s %s %s %.0fms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        (time.perf_counter() - started) * 1000,
    )
    return response


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {
        "service": "flowdesk-ai",
        "status": "ok",
        "environment": settings.environment,
    }


@app.get("/ready", tags=["system"])
async def readiness_check() -> dict[str, str]:
    return {
        "service": "flowdesk-ai",
        "status": "ok",
        "environment": settings.environment,
    }


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=64)


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    model_name: str
    dimensions: int


class AnswerSource(BaseModel):
    title: str = Field(max_length=240)
    excerpt: str = Field(max_length=2000)
    relevance: float = Field(ge=0, le=1)


class AnswerRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    sources: list[AnswerSource] = Field(max_length=8)


class AnswerResponse(BaseModel):
    answer: str
    model_name: str


@app.post("/v1/analyses/tickets", tags=["analysis"], response_model=TicketAnalysis)
def analyze_ticket(payload: TicketAnalysisRequest) -> TicketAnalysis:
    try:
        return build_analysis(payload, get_settings())
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/v1/knowledge/embeddings", tags=["knowledge"], response_model=EmbeddingResponse)
def create_embeddings(payload: EmbeddingRequest) -> EmbeddingResponse:
    texts = [text.strip() for text in payload.texts]
    if any(not text for text in texts) or any(len(text) > 8000 for text in texts):
        raise HTTPException(status_code=422, detail="Each text must contain between 1 and 8000 characters.")
    try:
        vectors, model_name = embed_texts(texts, get_settings())
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return EmbeddingResponse(
        embeddings=vectors,
        model_name=model_name,
        dimensions=EMBEDDING_DIMENSIONS,
    )


class AgentPlanRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    prior: str = Field(default="", max_length=500)


class AgentPlanResponse(BaseModel):
    tool_calls: list[dict]
    reply: str
    model_name: str


@app.post("/v1/agent/plan", tags=["agent"], response_model=AgentPlanResponse)
def plan_agent_turn(payload: AgentPlanRequest) -> AgentPlanResponse:
    plan = plan_message(payload.message.strip(), get_settings(), payload.prior.strip())
    return AgentPlanResponse(**plan)


@app.post("/v1/knowledge/answers", tags=["knowledge"], response_model=AnswerResponse)
def create_answer(payload: AnswerRequest) -> AnswerResponse:
    answer, model_name = answer_question(
        payload.question,
        [source.model_dump() for source in payload.sources],
        get_settings(),
    )
    return AnswerResponse(answer=answer, model_name=model_name)
