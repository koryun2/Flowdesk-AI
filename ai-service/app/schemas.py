from typing import Literal

from pydantic import BaseModel, Field


Category = Literal["bug", "feature_request", "billing", "general_inquiry"]
Priority = Literal["low", "medium", "high", "urgent"]
Sentiment = Literal["positive", "neutral", "negative"]
TagName = Literal["bug", "feature", "billing", "api", "export", "onboarding", "account"]

PROMPT_VERSION = "ticket-analysis-v1"
LOCAL_MODEL_NAME = "flowdesk-local"


class TicketAnalysisRequest(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    description: str = Field(min_length=1, max_length=20000)
    customer_name: str = Field(default="", max_length=200)
    customer_company: str = Field(default="", max_length=200)
    model: str = Field(default="", max_length=80)


class TicketAnalysisResult(BaseModel):
    category: Category
    priority: Priority
    summary: str = Field(min_length=1, max_length=500)
    sentiment: Sentiment
    suggested_tags: list[TagName] = Field(max_length=4)
    confidence: float = Field(ge=0, le=1)


class TicketAnalysis(TicketAnalysisResult):
    model_name: str = Field(min_length=1, max_length=120)
    prompt_version: str = Field(min_length=1, max_length=40)
