#!/usr/bin/env python3
"""
Shared models for web-ecommerce AI agents
Based on ai-native-todo-task-agent patterns
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any, Union
from datetime import datetime
import uuid
from enum import Enum


class AgentType(str, Enum):
    """Types of agents in the system"""
    USER_CHATBOT = "user_chatbot"
    ADMIN_CHATBOT = "admin_chatbot"
    SENTIMENT_ANALYZER = "sentiment_analyzer"
    BUSINESS_ANALYST = "business_analyst"
    REPORT_GENERATOR = "report_generator"
    ORCHESTRATOR = "orchestrator"


class AgentStep(BaseModel):
    """Individual step in agent execution"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task: str
    expectation: str
    reason: str = ""
    step_type: Literal["research", "build", "analyze", "generate"] = "research"
    agent_type: AgentType
    status: Literal["pending", "in_progress", "completed", "failed"] = "pending"
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class AgentStepOutput(BaseModel):
    """Output from an agent step"""
    step_id: str
    agent_type: AgentType
    full: str
    summary: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)


class AgentRequest(BaseModel):
    """Request to an agent"""
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: AgentType
    message: str
    context: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    priority: int = 1  # 1 = highest, 5 = lowest
    created_at: datetime = Field(default_factory=datetime.now)


class AgentResponse(BaseModel):
    """Response from an agent"""
    request_id: str
    agent_type: AgentType
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    steps: List[AgentStepOutput] = []
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    processing_time: Optional[float] = None


class ProductSearchRequest(BaseModel):
    """Request for product search"""
    query: str
    category: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    brand: Optional[str] = None
    limit: int = 10
    user_id: Optional[str] = None


class ProductSearchResult(BaseModel):
    """Result from product search"""
    id: int
    name: str
    price: float
    slug: str
    brand: Optional[str] = None
    category: Optional[str] = None
    score: Optional[float] = None
    image_url: Optional[str] = None


class SentimentAnalysisRequest(BaseModel):
    """Request for sentiment analysis"""
    texts: List[str]
    product_id: Optional[int] = None
    user_id: Optional[str] = None


class SentimentResult(BaseModel):
    """Result from sentiment analysis"""
    text: str
    sentiment: Literal["positive", "negative", "neutral"]
    confidence: float
    reason: Optional[str] = None


class SentimentAnalysisResponse(BaseModel):
    """Response from sentiment analysis"""
    results: List[SentimentResult]
    summary: Dict[str, int]  # {"positive": 5, "negative": 2, "neutral": 3}
    product_id: Optional[int] = None
    total_comments: int


class RevenueAnalysisRequest(BaseModel):
    """Request for revenue analysis"""
    period: Literal["daily", "weekly", "monthly", "yearly"]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    product_id: Optional[int] = None
    category: Optional[str] = None


class RevenueDataPoint(BaseModel):
    """Single data point in revenue analysis"""
    period: str  # "2024-01", "2024-01-15", etc.
    revenue: float
    orders: int
    avg_order_value: float


class RevenueAnalysisResponse(BaseModel):
    """Response from revenue analysis"""
    data: List[RevenueDataPoint]
    summary: Dict[str, Any]  # total revenue, growth rate, etc.
    period: str
    generated_at: datetime = Field(default_factory=datetime.now)


class ReportGenerationRequest(BaseModel):
    """Request for report generation"""
    report_type: Literal["summary", "detailed", "executive"]
    include_charts: bool = True
    format: Literal["html", "pdf", "json"] = "html"
    period: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class ReportResponse(BaseModel):
    """Response from report generation"""
    report_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: str
    format: str
    content: str  # HTML content or file path
    metadata: Dict[str, Any]
    generated_at: datetime = Field(default_factory=datetime.now)
    file_size: Optional[int] = None


class ChatMessage(BaseModel):
    """Chat message between user and agent"""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None


class ChatSession(BaseModel):
    """Chat session with an agent"""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    agent_type: AgentType
    messages: List[ChatMessage] = []
    context: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = True


class AgentCapabilities(BaseModel):
    """Capabilities of an agent"""
    agent_type: AgentType
    can_search_products: bool = False
    can_analyze_sentiment: bool = False
    can_analyze_revenue: bool = False
    can_generate_reports: bool = False
    can_use_tools: bool = False
    max_context_length: int = 4000
    supported_languages: List[str] = ["vi", "en"]


class AgentStatus(BaseModel):
    """Status of an agent"""
    agent_type: AgentType
    is_active: bool = True
    current_requests: int = 0
    total_requests: int = 0
    last_activity: Optional[datetime] = None
    error_count: int = 0
    average_response_time: Optional[float] = None


class ToolCall(BaseModel):
    """Tool call from agent"""
    tool_name: str
    parameters: Dict[str, Any]
    call_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)


class ToolResult(BaseModel):
    """Result from tool call"""
    call_id: str
    tool_name: str
    success: bool
    result: Any
    error: Optional[str] = None
    execution_time: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class AgentError(BaseModel):
    """Error from agent execution"""
    error_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: AgentType
    request_id: Optional[str] = None
    error_type: str
    message: str
    stack_trace: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    resolved: bool = False


class AgentMetrics(BaseModel):
    """Metrics for agent performance"""
    agent_type: AgentType
    period: str  # "2024-01", "2024-01-15", etc.
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time: float = 0.0
    total_tokens_used: int = 0
    total_cost: float = 0.0
    generated_at: datetime = Field(default_factory=datetime.now)


class SystemHealth(BaseModel):
    """Overall system health status"""
    status: Literal["healthy", "degraded", "unhealthy"]
    agents: List[AgentStatus]
    database_connected: bool = True
    llm_available: bool = True
    last_check: datetime = Field(default_factory=datetime.now)
    issues: List[str] = []
