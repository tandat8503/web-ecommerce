#!/usr/bin/env python3
"""
Report Progress Tracker
Tracks và emits detailed progress events cho report generation
"""

import json
import logging
import asyncio
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class ProgressStep(Enum):
    """Report generation steps"""
    COLLECTING_DATA = 1
    CALCULATING = 2
    AI_ANALYZING = 3
    GENERATING_HTML = 4
    COMPLETED = 5


class ReportProgressTracker:
    """Track detailed progress của report generation"""
    
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id
        self.progress_callback: Optional[Callable] = None
        self.current_step = 0
        self.steps_data = []
    
    def set_callback(self, callback: Callable):
        """Set callback function để emit progress events"""
        self.progress_callback = callback
    
    async def emit_progress(
        self,
        step: ProgressStep,
        message: str,
        percentage: int,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Emit progress event với detailed information
        
        Args:
            step: Current step
            message: Human-readable message
            percentage: Progress percentage (0-100)
            details: Detailed data về step này
        """
        progress_event = {
            "step": step.value,
            "step_name": step.name,
            "message": message,
            "percentage": percentage,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        
        self.steps_data.append(progress_event)
        self.current_step = step.value
        
        # Emit qua callback nếu có (callback sẽ queue event)
        if self.progress_callback:
            try:
                if asyncio.iscoroutinefunction(self.progress_callback):
                    await self.progress_callback(progress_event)
                else:
                    self.progress_callback(progress_event)
            except Exception as e:
                logger.error(f"Error emitting progress: {e}")
        
        logger.info(f"Progress: {step.name} - {message} ({percentage}%)")
    
    async def step_collecting_data(
        self,
        data_sources: List[Dict[str, Any]],
        total_items: int
    ):
        """Step 1: Thu thập dữ liệu"""
        details = {
            "data_sources": data_sources,
            "total_items": total_items,
            "collected_items": sum(ds.get("count", 0) for ds in data_sources),
            "sources_count": len(data_sources)
        }
        
        await self.emit_progress(
            step=ProgressStep.COLLECTING_DATA,
            message="Đang thu thập dữ liệu...",
            percentage=0,
            details=details
        )
    
    async def step_calculating(
        self,
        calculations: List[Dict[str, Any]],
        formulas: List[str]
    ):
        """Step 2: Tính toán số liệu"""
        details = {
            "calculations": calculations,
            "formulas": formulas,
            "calculations_count": len(calculations)
        }
        
        await self.emit_progress(
            step=ProgressStep.CALCULATING,
            message="Đang tính toán số liệu...",
            percentage=25,
            details=details
        )
    
    async def step_ai_analyzing(
        self,
        model: str,
        prompt_preview: str,
        data_summary: Dict[str, Any],
        processing_time: Optional[float] = None
    ):
        """Step 3: AI Phân tích"""
        details = {
            "model": model,
            "prompt_preview": prompt_preview[:200] + "..." if len(prompt_preview) > 200 else prompt_preview,
            "data_summary": data_summary,
            "processing_time": processing_time
        }
        
        await self.emit_progress(
            step=ProgressStep.AI_ANALYZING,
            message="AI đang phân tích...",
            percentage=50,
            details=details
        )
    
    async def step_generating_html(
        self,
        template_name: str,
        charts_count: int,
        metrics_count: int,
        components: List[str]
    ):
        """Step 4: Tạo báo cáo HTML"""
        details = {
            "template_name": template_name,
            "charts_count": charts_count,
            "metrics_count": metrics_count,
            "components": components,
            "total_components": len(components)
        }
        
        await self.emit_progress(
            step=ProgressStep.GENERATING_HTML,
            message="Đang tạo báo cáo HTML...",
            percentage=75,
            details=details
        )
    
    async def step_completed(
        self,
        report_id: str,
        report_url: str,
        file_size: int,
        total_time: float
    ):
        """Step 5: Hoàn thành"""
        details = {
            "report_id": report_id,
            "report_url": report_url,
            "file_size": file_size,
            "file_size_mb": round(file_size / 1024 / 1024, 2),
            "total_time": total_time,
            "total_steps": len(self.steps_data)
        }
        
        await self.emit_progress(
            step=ProgressStep.COMPLETED,
            message="Hoàn thành!",
            percentage=100,
            details=details
        )
    
    def get_all_steps(self) -> List[Dict[str, Any]]:
        """Get tất cả progress steps"""
        return self.steps_data

