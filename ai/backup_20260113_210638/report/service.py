#!/usr/bin/env python3
"""
HTML Report Generation Service
Uses Gemini Pro to generate comprehensive visual reports
"""

import logging
import json
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
from shared.llm_client import LLMClientFactory
from core.db import get_conn, release_conn
from .progress_tracker import ReportProgressTracker, ProgressStep

logger = logging.getLogger(__name__)

# Template directory
TEMPLATE_DIR = Path(__file__).parent / "templates"


class ReportGeneratorService:
    """Service for generating HTML visual reports"""
    
    def __init__(self):
        self.llm_client = LLMClientFactory.create_client()
        self.report_types = [
            "sentiment",  # Báo cáo phân tích cảm xúc
            "revenue",  # Báo cáo doanh thu
            "product",  # Báo cáo hiệu suất sản phẩm
            "customer",  # Báo cáo khách hàng
            "business",  # Báo cáo kinh doanh tổng hợp
        ]
    
    async def generate_html_report(
        self,
        report_type: str,
        data: Dict[str, Any],
        title: Optional[str] = None,
        period: Optional[str] = None,
        progress_tracker: Optional[ReportProgressTracker] = None
    ) -> Dict[str, Any]:
        """
        Generate HTML visual report with AI insights và detailed progress tracking
        
        Args:
            report_type: Type of report (sentiment, revenue, product, etc.)
            data: Report data from analytics/sentiment tools
            title: Custom report title
            period: Time period description
            progress_tracker: Optional progress tracker để emit events
        
        Returns:
        {
            "success": bool,
            "html": str,  # Full HTML report with CSS and charts
            "summary": str,  # Executive summary
            "insights": List[str],  # Key insights
            "recommendations": List[str],  # Action recommendations
            "charts_data": Dict,  # Data for charts
            "generated_at": str,
            "progress_steps": List[Dict]  # Detailed progress steps
        }
        """
        start_time = time.time()
        
        try:
            # Step 1: Thu thập dữ liệu
            if progress_tracker:
                data_sources = self._extract_data_sources(report_type, data)
                await progress_tracker.step_collecting_data(
                    data_sources=data_sources,
                    total_items=self._count_data_items(report_type, data)
                )
            
            # Generate report title
            if not title:
                title = self._generate_title(report_type, period)
            
            # Step 2: Tính toán số liệu
            prepared_data = self._prepare_data(data, report_type)
            
            if progress_tracker:
                calculations = self._extract_calculations(report_type, data, prepared_data)
                formulas = self._extract_formulas(report_type, data, prepared_data)
                await progress_tracker.step_calculating(
                    calculations=calculations,
                    formulas=formulas
                )
            
            # Step 3: AI Phân tích
            ai_start_time = time.time()
            ai_analysis = await self._generate_ai_analysis(
                report_type, 
                prepared_data, 
                period,
                progress_tracker=progress_tracker
            )
            ai_processing_time = time.time() - ai_start_time
            
            # Step 4: Tạo báo cáo HTML
            if progress_tracker:
                charts_count = len(prepared_data.get("charts", {}))
                metrics_count = self._count_metrics(report_type, prepared_data)
                components = self._list_components(report_type, prepared_data, ai_analysis)
                
                await progress_tracker.step_generating_html(
                    template_name=self._get_template_name(report_type),
                    charts_count=charts_count,
                    metrics_count=metrics_count,
                    components=components
                )
            
            html_content = self._generate_html(
                title=title,
                report_type=report_type,
                data=prepared_data,
                ai_analysis=ai_analysis,
                period=period
            )
            
            total_time = time.time() - start_time
            
            result = {
                "success": True,
                "html": html_content,
                "summary": ai_analysis.get("summary", ""),
                "insights": ai_analysis.get("insights", []),
                "recommendations": ai_analysis.get("recommendations", []),
                "charts_data": prepared_data.get("charts", {}),
                "generated_at": datetime.now().isoformat(),
                "report_type": report_type,
                "period": period,
                "title": title,
                "processing_time": total_time
            }
            
            # Add progress steps nếu có
            if progress_tracker:
                result["progress_steps"] = progress_tracker.get_all_steps()
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating HTML report: {e}")
            return {
                "success": False,
                "error": str(e),
                "html": self._generate_error_html(str(e)),
                "summary": f"Lỗi tạo báo cáo: {str(e)}",
                "insights": [],
                "recommendations": [],
                "charts_data": {},
                "generated_at": datetime.now().isoformat()
            }
    
    def _generate_title(self, report_type: str, period: Optional[str]) -> str:
        """Generate report title"""
        titles = {
            "sentiment": "Báo cáo Phân tích Cảm xúc Khách hàng",
            "revenue": "Báo cáo Doanh thu và Tài chính",
            "product": "Báo cáo Hiệu suất Sản phẩm",
            "customer": "Báo cáo Phân tích Khách hàng",
            "business": "Báo cáo Kinh doanh Tổng hợp"
        }
        
        base_title = titles.get(report_type, "Báo cáo Dữ liệu")
        if period:
            return f"{base_title} - {period}"
        return base_title
    
    def _prepare_data(self, data: Dict[str, Any], report_type: str) -> Dict[str, Any]:
        """Prepare and structure data for visualization"""
        if report_type == "sentiment":
            return self._prepare_sentiment_data(data)
        elif report_type == "revenue":
            return self._prepare_revenue_data(data)
        elif report_type == "product":
            return self._prepare_product_data(data)
        elif report_type == "customer":
            return self._prepare_customer_data(data)
        else:
            return {"raw": data, "charts": {}}
    
    def _prepare_sentiment_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare sentiment analysis data"""
        sentiment_data = data.get("sentiments", [])
        
        # Calculate distribution
        distribution = {"positive": 0, "negative": 0, "neutral": 0}
        for item in sentiment_data:
            sentiment = item.get("sentiment", "neutral")
            distribution[sentiment] = distribution.get(sentiment, 0) + 1
        
        total = sum(distribution.values())
        percentages = {
            k: round((v / total * 100), 1) if total > 0 else 0 
            for k, v in distribution.items()
        }
        
        return {
            "distribution": distribution,
            "percentages": percentages,
            "total": total,
            "top_products": data.get("top_products", []),
            "charts": {
                "sentiment_pie": {
                    "labels": ["Tích cực", "Tiêu cực", "Trung lập"],
                    "data": [
                        distribution["positive"],
                        distribution["negative"],
                        distribution["neutral"]
                    ],
                    "colors": ["#10b981", "#ef4444", "#6b7280"]
                }
            }
        }
    
    def _prepare_revenue_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare revenue data"""
        revenue_items = data.get("revenue", [])
        
        # Extract labels and values
        labels = [item.get("period", "") for item in revenue_items]
        values = [float(item.get("revenue", 0)) for item in revenue_items]
        
        total_revenue = sum(values)
        avg_revenue = total_revenue / len(values) if values else 0
        
        return {
            "total_revenue": total_revenue,
            "avg_revenue": avg_revenue,
            "periods": len(labels),
            "highest": max(values) if values else 0,
            "lowest": min(values) if values else 0,
            "charts": {
                "revenue_line": {
                    "labels": labels,
                    "data": values,
                    "color": "#3b82f6"
                }
            }
        }
    
    def _prepare_product_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare product performance data"""
        products = data.get("products", [])
        
        # Top products by revenue
        top_products = sorted(
            products, 
            key=lambda x: float(x.get("revenue", 0)), 
            reverse=True
        )[:10]
        
        labels = [p.get("name", "")[:20] for p in top_products]
        revenue_data = [float(p.get("revenue", 0)) for p in top_products]
        quantity_data = [int(p.get("quantity_sold", 0)) for p in top_products]
        
        return {
            "total_products": len(products),
            "top_products": top_products,
            "charts": {
                "product_bar": {
                    "labels": labels,
                    "revenue": revenue_data,
                    "quantity": quantity_data,
                    "color": "#8b5cf6"
                }
            }
        }
    
    def _prepare_customer_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare customer data"""
        return {
            "total_customers": data.get("total_customers", 0),
            "new_customers": data.get("new_customers", 0),
            "returning_customers": data.get("returning_customers", 0),
            "charts": {}
        }
    
    def _prepare_ai_data_summary(self, report_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare condensed data summary for AI analysis
        ✅ Giảm context: Chỉ gửi statistics/summary, không gửi raw data lớn
        """
        if report_type == "sentiment":
            return {
                "total_reviews": data.get("total", 0),
                "positive_percent": data.get("percentages", {}).get("positive", 0),
                "negative_percent": data.get("percentages", {}).get("negative", 0),
                "neutral_percent": data.get("percentages", {}).get("neutral", 0),
                "top_products_count": len(data.get("top_products", []))
            }
        elif report_type == "revenue":
            return {
                "total_revenue": data.get("total_revenue", 0),
                "avg_revenue": data.get("avg_revenue", 0),
                "highest_revenue": data.get("highest", 0),
                "lowest_revenue": data.get("lowest", 0),
                "periods_count": data.get("periods", 0)
            }
        elif report_type == "product":
            return {
                "total_products": data.get("total_products", 0),
                "top_products_count": len(data.get("top_products", [])),
                "top_products": [
                    {
                        "name": p.get("name", "")[:50],  # Limit name length
                        "revenue": p.get("revenue", 0),
                        "quantity": p.get("total_quantity", 0)
                    }
                    for p in data.get("top_products", [])[:5]  # Only top 5
                ]
            }
        elif report_type == "customer":
            return {
                "total_customers": data.get("total_customers", 0),
                "new_customers": data.get("new_customers", 0),
                "returning_customers": data.get("returning_customers", 0)
            }
        else:
            # Business report - send key metrics only
            return {
                "key_metrics": {
                    k: v for k, v in data.items() 
                    if not isinstance(v, (list, dict)) or len(str(v)) < 200
                }
            }
    
    def _extract_data_sources(self, report_type: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract detailed data sources information"""
        sources = []
        
        if report_type == "sentiment":
            sentiments = data.get("sentiments", [])
            sources.append({
                "name": "Đánh giá khách hàng",
                "source": "product_comments table",
                "count": len(sentiments),
                "description": f"Thu thập {len(sentiments)} đánh giá từ database"
            })
            
            top_products = data.get("top_products", [])
            if top_products:
                sources.append({
                    "name": "Top sản phẩm",
                    "source": "products table",
                    "count": len(top_products),
                    "description": f"Lấy {len(top_products)} sản phẩm có nhiều đánh giá nhất"
                })
        
        elif report_type == "revenue":
            revenue_items = data.get("revenue", [])
            sources.append({
                "name": "Dữ liệu doanh thu",
                "source": "orders table",
                "count": len(revenue_items),
                "description": f"Thu thập doanh thu từ {len(revenue_items)} kỳ"
            })
        
        elif report_type == "product":
            products = data.get("products", [])
            sources.append({
                "name": "Dữ liệu sản phẩm",
                "source": "products + order_items tables",
                "count": len(products),
                "description": f"Thu thập dữ liệu từ {len(products)} sản phẩm"
            })
        
        return sources
    
    def _count_data_items(self, report_type: str, data: Dict[str, Any]) -> int:
        """Count total data items"""
        if report_type == "sentiment":
            return len(data.get("sentiments", []))
        elif report_type == "revenue":
            return len(data.get("revenue", []))
        elif report_type == "product":
            return len(data.get("products", []))
        return 0
    
    def _extract_calculations(self, report_type: str, data: Dict[str, Any], prepared_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract detailed calculations"""
        calculations = []
        
        if report_type == "sentiment":
            total = prepared_data.get("total", 0)
            percentages = prepared_data.get("percentages", {})
            distribution = prepared_data.get("distribution", {})
            
            # Calculation 1: Phân bổ cảm xúc
            calculations.append({
                "name": "Phân bổ cảm xúc",
                "description": "Đếm số lượng đánh giá theo từng loại cảm xúc",
                "inputs": {
                    "total_reviews": total,
                    "sentiment_data": len(data.get("sentiments", []))
                },
                "outputs": {
                    "positive": distribution.get("positive", 0),
                    "negative": distribution.get("negative", 0),
                    "neutral": distribution.get("neutral", 0)
                }
            })
            
            # Calculation 2: Tính phần trăm
            calculations.append({
                "name": "Tính phần trăm",
                "description": "Chuyển đổi số lượng thành phần trăm",
                "inputs": {
                    "distribution": distribution,
                    "total": total
                },
                "outputs": percentages
            })
        
        elif report_type == "revenue":
            revenue_items = data.get("revenue", [])
            values = [float(item.get("revenue", 0)) for item in revenue_items]
            
            # Calculation 1: Tổng doanh thu
            total_revenue = sum(values)
            calculations.append({
                "name": "Tổng doanh thu",
                "description": "Tính tổng doanh thu từ tất cả các kỳ",
                "inputs": {
                    "revenue_items": len(values),
                    "values": values[:5]  # Show first 5
                },
                "outputs": {
                    "total_revenue": total_revenue
                }
            })
            
            # Calculation 2: Doanh thu trung bình
            avg_revenue = total_revenue / len(values) if values else 0
            calculations.append({
                "name": "Doanh thu trung bình",
                "description": "Tính doanh thu trung bình mỗi kỳ",
                "inputs": {
                    "total_revenue": total_revenue,
                    "periods": len(values)
                },
                "outputs": {
                    "avg_revenue": avg_revenue
                }
            })
        
        return calculations
    
    def _extract_formulas(self, report_type: str, data: Dict[str, Any], prepared_data: Dict[str, Any]) -> List[str]:
        """Extract calculation formulas"""
        formulas = []
        
        if report_type == "sentiment":
            total = prepared_data.get("total", 0)
            percentages = prepared_data.get("percentages", {})
            distribution = prepared_data.get("distribution", {})
            
            for sentiment, count in distribution.items():
                percent = percentages.get(sentiment, 0)
                formulas.append(
                    f"{sentiment.capitalize()}: {count} đánh giá = {total} × {percent}%"
                )
        
        elif report_type == "revenue":
            total = prepared_data.get("total_revenue", 0)
            periods = prepared_data.get("periods", 0)
            avg = prepared_data.get("avg_revenue", 0)
            
            formulas.append(f"Tổng doanh thu = Σ(revenue_items)")
            formulas.append(f"Doanh thu TB = {total:,.0f} ÷ {periods} = {avg:,.0f} VNĐ")
        
        return formulas
    
    def _count_metrics(self, report_type: str, prepared_data: Dict[str, Any]) -> int:
        """Count number of metrics"""
        if report_type == "sentiment":
            return 4  # total, positive%, negative%, neutral%
        elif report_type == "revenue":
            return 4  # total, avg, highest, lowest
        elif report_type == "product":
            return len(prepared_data.get("top_products", []))
        return 0
    
    def _list_components(self, report_type: str, prepared_data: Dict[str, Any], ai_analysis: Dict[str, Any]) -> List[str]:
        """List all report components"""
        components = []
        
        # Charts
        charts = prepared_data.get("charts", {})
        for chart_id, chart_data in charts.items():
            chart_type = "Doughnut" if "pie" in chart_id else "Line" if "line" in chart_id else "Bar"
            components.append(f"Biểu đồ {chart_type}: {chart_id}")
        
        # Metrics
        metrics_count = self._count_metrics(report_type, prepared_data)
        if metrics_count > 0:
            components.append(f"{metrics_count} metric cards")
        
        # Insights
        insights_count = len(ai_analysis.get("insights", []))
        if insights_count > 0:
            components.append(f"{insights_count} insights")
        
        # Recommendations
        recs_count = len(ai_analysis.get("recommendations", []))
        if recs_count > 0:
            components.append(f"{recs_count} recommendations")
        
        # Summary
        if ai_analysis.get("summary"):
            components.append("Executive summary")
        
        return components
    
    async def _generate_ai_analysis(
        self,
        report_type: str,
        data: Dict[str, Any],
        period: Optional[str],
        progress_tracker: Optional[ReportProgressTracker] = None
    ) -> Dict[str, Any]:
        """
        Generate AI insights and recommendations
        ✅ Tối ưu: Chỉ gửi summary data, không gửi raw data lớn để tránh tràn context
        """
        
        if not self.llm_client:
            return self._generate_default_analysis(report_type, data)
        
        # Prepare condensed data summary (chỉ statistics, không raw data)
        data_summary = self._prepare_ai_data_summary(report_type, data)
        
        system_instruction = f"""
You are a business analyst expert generating insights for an e-commerce report.

Task: Analyze the following {report_type} data statistics and provide ONLY JSON data:
1. Executive summary (2-3 sentences in Vietnamese)
2. Key insights (3-5 bullet points in Vietnamese)
3. Action recommendations (3-5 bullet points in Vietnamese)

⚠️ IMPORTANT: 
- Return ONLY JSON, NO HTML tags, NO markdown formatting
- Just pure JSON object with summary, insights array, recommendations array
- Be specific, data-driven, and actionable
- Write all text in Vietnamese
- Focus on trends and actionable insights

JSON format:
{{
    "summary": "Brief executive summary in Vietnamese",
    "insights": ["Insight 1", "Insight 2", ...],
    "recommendations": ["Recommendation 1", "Recommendation 2", ...]
}}
"""
        
        prompt = f"""
Report Type: {report_type}
Period: {period or 'Not specified'}
Data Statistics (condensed):
{json.dumps(data_summary, ensure_ascii=False, indent=2)}

Analyze these statistics and provide insights in JSON format.
"""
        
        # Emit progress nếu có tracker
        if progress_tracker:
            await progress_tracker.step_ai_analyzing(
                model="gemini-1.5-pro",
                prompt_preview=prompt,
                data_summary=data_summary
            )
        
        try:
            ai_start = time.time()
            response = await self.llm_client.generate_simple(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.7,
                max_tokens=1000,
                model="gemini-1.5-pro"
            )
            ai_time = time.time() - ai_start
            
            if response.get("success"):
                content_text = response.get("content", "{}")
                if "```json" in content_text:
                    content_text = content_text.split("```json")[1].split("```")[0]
                elif "```" in content_text:
                    content_text = content_text.split("```")[1].split("```")[0]
                
                result = json.loads(content_text.strip())
                
                # Update progress với output
                if progress_tracker:
                    await progress_tracker.emit_progress(
                        step=ProgressStep.AI_ANALYZING,
                        message="AI đã hoàn thành phân tích",
                        percentage=50,
                        details={
                            "model": "gemini-1.5-pro",
                            "processing_time": ai_time,
                            "insights_count": len(result.get("insights", [])),
                            "recommendations_count": len(result.get("recommendations", [])),
                            "has_summary": bool(result.get("summary"))
                        }
                    )
                
                return result
            else:
                return self._generate_default_analysis(report_type, data)
                
        except Exception as e:
            logger.error(f"Error generating AI analysis: {e}")
            return self._generate_default_analysis(report_type, data)
    
    def _generate_default_analysis(
        self, 
        report_type: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate default analysis without AI"""
        
        if report_type == "sentiment":
            total = data.get("total", 0)
            percentages = data.get("percentages", {})
            return {
                "summary": f"Phân tích {total} đánh giá khách hàng. "
                          f"Tích cực: {percentages.get('positive', 0)}%, "
                          f"Tiêu cực: {percentages.get('negative', 0)}%",
                "insights": [
                    f"Tổng số đánh giá: {total}",
                    f"Tỷ lệ tích cực: {percentages.get('positive', 0)}%",
                    f"Cần cải thiện nếu tỷ lệ tiêu cực > 20%"
                ],
                "recommendations": [
                    "Tập trung cải thiện trải nghiệm khách hàng",
                    "Phản hồi nhanh các đánh giá tiêu cực",
                    "Khuyến khích khách hàng hài lòng để lại đánh giá"
                ]
            }
        elif report_type == "revenue":
            total = data.get("total_revenue", 0)
            avg = data.get("avg_revenue", 0)
            return {
                "summary": f"Tổng doanh thu: {total:,.0f} VNĐ. "
                          f"Trung bình: {avg:,.0f} VNĐ",
                "insights": [
                    f"Tổng doanh thu: {total:,.0f} VNĐ",
                    f"Doanh thu trung bình: {avg:,.0f} VNĐ",
                    f"Số kỳ phân tích: {data.get('periods', 0)}"
                ],
                "recommendations": [
                    "Tập trung vào các sản phẩm có doanh thu cao",
                    "Xem xét chiến dịch marketing cho sản phẩm yếu",
                    "Tối ưu hóa giá và khuyến mãi"
                ]
            }
        else:
            return {
                "summary": "Báo cáo dữ liệu tổng hợp",
                "insights": ["Dữ liệu đã được thu thập và phân tích"],
                "recommendations": ["Xem xét dữ liệu chi tiết để ra quyết định"]
            }
    
    def _get_template_name(self, report_type: str) -> str:
        """Get template name based on report type"""
        template_map = {
            "sentiment": "sentiment.html",
            "revenue": "revenue.html",
            "product": "product.html",
            "customer": "base.html",  # Use base for customer
            "business": "business.html"
        }
        return template_map.get(report_type, "base.html")
    
    def _load_template(self, template_name: str = "base.html") -> str:
        """Load HTML template from file"""
        template_path = TEMPLATE_DIR / template_name
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.warning(f"Template not found: {template_path}, using base.html")
            # Fallback to base template
            base_path = TEMPLATE_DIR / "base.html"
            with open(base_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error loading template: {e}")
            return self._generate_error_html(f"Error loading template: {str(e)}")
    
    def _generate_html(
        self,
        title: str,
        report_type: str,
        data: Dict[str, Any],
        ai_analysis: Dict[str, Any],
        period: Optional[str]
    ) -> str:
        """
        Generate HTML report by filling data into template
        ✅ Giảm token: Chỉ fill data vào template có sẵn, không generate HTML structure
        ✅ Template phù hợp: Chọn template theo report_type
        """
        # Load appropriate template
        template_name = self._get_template_name(report_type)
        template = self._load_template(template_name)
        
        # Prepare data for template
        period_text = period or 'Toàn bộ thời gian'
        generated_date = datetime.now().strftime('%d/%m/%Y %H:%M')
        summary = ai_analysis.get('summary', 'Không có tóm tắt')
        
        # Generate metrics HTML
        metrics_html = self._generate_metrics_html(report_type, data)
        
        # Generate charts HTML
        charts_html = self._generate_charts_html(report_type, data)
        
        # Generate insights list với Tailwind CSS (như ai-native-todo-task-agent)
        insights_list = "".join(
            f'<li class="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-3 hover:bg-green-100 transition-colors"><span class="text-green-600 font-semibold">💡</span> {insight}</li>' 
            for insight in ai_analysis.get('insights', [])
        ) or '<li class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-lg text-gray-600">Không có thông tin chi tiết</li>'
        
        # Generate recommendations list với Tailwind CSS
        recommendations_list = "".join(
            f'<li class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-3 hover:bg-blue-100 transition-colors"><span class="text-blue-600 font-semibold">🎯</span> {rec}</li>' 
            for rec in ai_analysis.get('recommendations', [])
        ) or '<li class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-lg text-gray-600">Không có khuyến nghị</li>'
        
        # Generate chart scripts
        chart_scripts = self._generate_chart_scripts(report_type, data)
        
        # Fill template with data (simple string replacement)
        html = template.replace('{{TITLE}}', title)
        html = html.replace('{{PERIOD}}', period_text)
        html = html.replace('{{GENERATED_DATE}}', generated_date)
        html = html.replace('{{SUMMARY}}', summary)
        html = html.replace('{{METRICS_HTML}}', metrics_html)
        html = html.replace('{{CHARTS_HTML}}', charts_html)
        html = html.replace('{{INSIGHTS_LIST}}', insights_list)
        html = html.replace('{{RECOMMENDATIONS_LIST}}', recommendations_list)
        html = html.replace('{{CHART_SCRIPTS}}', chart_scripts)
        
        return html
    
    def _generate_metrics_html(self, report_type: str, data: Dict[str, Any]) -> str:
        """
        Generate metrics HTML với Tailwind CSS (như ai-native-todo-task-agent)
        """
        if report_type == "sentiment":
            percentages = data.get("percentages", {})
            return f"""
            <section class="mb-10 animate-slide-up">
                <h2 class="text-3xl font-bold text-sentiment-green mb-6 pb-3 border-b-4 border-sentiment-green">📈 Chỉ số chính</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div class="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-3xl md:text-4xl font-bold mb-2">{data.get('total', 0)}</h3>
                        <p class="opacity-90">Tổng đánh giá</p>
                    </div>
                    <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-3xl md:text-4xl font-bold mb-2">{percentages.get('positive', 0)}%</h3>
                        <p class="opacity-90">Tích cực</p>
                    </div>
                    <div class="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-3xl md:text-4xl font-bold mb-2">{percentages.get('negative', 0)}%</h3>
                        <p class="opacity-90">Tiêu cực</p>
                    </div>
                    <div class="bg-gradient-to-br from-gray-500 to-gray-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-3xl md:text-4xl font-bold mb-2">{percentages.get('neutral', 0)}%</h3>
                        <p class="opacity-90">Trung lập</p>
                    </div>
                </div>
            </section>
            """
        elif report_type == "revenue":
            return f"""
            <section class="mb-10 animate-slide-up">
                <h2 class="text-3xl font-bold text-revenue-blue mb-6 pb-3 border-b-4 border-revenue-blue">📈 Chỉ số chính</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-2xl md:text-3xl font-bold mb-2">{data.get('total_revenue', 0):,.0f} ₫</h3>
                        <p class="opacity-90 text-sm">Tổng doanh thu</p>
                    </div>
                    <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-2xl md:text-3xl font-bold mb-2">{data.get('avg_revenue', 0):,.0f} ₫</h3>
                        <p class="opacity-90 text-sm">Doanh thu TB</p>
                    </div>
                    <div class="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-2xl md:text-3xl font-bold mb-2">{data.get('highest', 0):,.0f} ₫</h3>
                        <p class="opacity-90 text-sm">Cao nhất</p>
                    </div>
                    <div class="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
                        <h3 class="text-3xl md:text-4xl font-bold mb-2">{data.get('periods', 0)}</h3>
                        <p class="opacity-90">Số kỳ</p>
                    </div>
                </div>
            </section>
            """
        else:
            return ""
    
    def _generate_charts_html(self, report_type: str, data: Dict[str, Any]) -> str:
        """
        Generate charts HTML với Tailwind CSS (như ai-native-todo-task-agent)
        """
        charts = data.get("charts", {})
        
        if not charts:
            return ""
        
        # Determine section title color based on report type (use inline style for dynamic colors)
        color_map = {
            "sentiment": ("text-green-600", "border-green-500"),
            "revenue": ("text-blue-600", "border-blue-500"),
            "product": ("text-purple-600", "border-purple-500"),
            "business": ("text-purple-600", "border-purple-500")
        }
        text_color, border_color = color_map.get(report_type, ("text-purple-600", "border-purple-500"))
        
        html = f'<section class="mb-10 animate-slide-up"><h2 class="text-3xl font-bold {text_color} mb-6 pb-3 border-b-4 {border_color}">📊 Biểu đồ dữ liệu</h2>'
        
        for chart_id, chart_data in charts.items():
            html += f'<div class="bg-white rounded-xl shadow-lg p-6 mb-6"><div class="relative h-80 md:h-96"><canvas id="{chart_id}"></canvas></div></div>'
        
        html += '</section>'
        return html
    
    def _generate_chart_scripts(self, report_type: str, data: Dict[str, Any]) -> str:
        """
        Generate Chart.js scripts with context-appropriate visualizations
        ✅ Chart phù hợp: Mỗi loại report có chart type phù hợp với data
        """
        charts = data.get("charts", {})
        
        if not charts:
            return ""
        
        scripts = "<script>"
        
        for chart_id, chart_data in charts.items():
            if "sentiment_pie" in chart_id or "sentiment" in chart_id:
                # Sentiment: Doughnut chart với colors phù hợp
                scripts += f"""
                new Chart(document.getElementById('{chart_id}'), {{
                    type: 'doughnut',
                    data: {{
                        labels: {json.dumps(chart_data.get('labels', []))},
                        datasets: [{{
                            data: {json.dumps(chart_data.get('data', []))},
                            backgroundColor: {json.dumps(chart_data.get('colors', ['#10b981', '#ef4444', '#6b7280']))},
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{ 
                                position: 'bottom',
                                labels: {{ padding: 15, font: {{ size: 14 }} }}
                            }},
                            title: {{ 
                                display: true, 
                                text: 'Phân bổ cảm xúc khách hàng',
                                font: {{ size: 18, weight: 'bold' }},
                                padding: {{ top: 10, bottom: 20 }}
                            }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        let label = context.label || '';
                                        let value = context.parsed || 0;
                                        let total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        let percentage = ((value / total) * 100).toFixed(1);
                                        return label + ': ' + value + ' (' + percentage + '%)';
                                    }}
                                }}
                            }}
                        }}
                    }}
                }});
                """
            elif "revenue_line" in chart_id or "revenue" in chart_id:
                # Revenue: Line chart với gradient fill
                scripts += f"""
                new Chart(document.getElementById('{chart_id}'), {{
                    type: 'line',
                    data: {{
                        labels: {json.dumps(chart_data.get('labels', []))},
                        datasets: [{{
                            label: 'Doanh thu (VNĐ)',
                            data: {json.dumps(chart_data.get('data', []))},
                            borderColor: '{chart_data.get('color', '#3b82f6')}',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: '#3b82f6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{ display: true, position: 'top' }},
                            title: {{ 
                                display: true, 
                                text: 'Xu hướng doanh thu theo thời gian',
                                font: {{ size: 18, weight: 'bold' }},
                                padding: {{ top: 10, bottom: 20 }}
                            }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        return 'Doanh thu: ' + new Intl.NumberFormat('vi-VN').format(context.parsed.y) + ' VNĐ';
                                    }}
                                }}
                            }}
                        }},
                        scales: {{
                            y: {{ 
                                beginAtZero: true,
                                ticks: {{
                                    callback: function(value) {{
                                        return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
                                    }}
                                }},
                                grid: {{ color: 'rgba(0,0,0,0.05)' }}
                            }},
                            x: {{
                                grid: {{ display: false }}
                            }}
                        }}
                    }}
                }});
                """
            elif "product_bar" in chart_id or "product" in chart_id:
                # Product: Bar chart với dual datasets (revenue + quantity)
                has_quantity = 'quantity' in chart_data
                datasets = [{
                    "label": "Doanh thu (VNĐ)",
                    "data": chart_data.get('revenue', []),
                    "backgroundColor": "rgba(139, 92, 246, 0.8)",
                    "borderColor": "#8b5cf6",
                    "borderWidth": 2
                }]
                
                if has_quantity:
                    datasets.append({
                        "label": "Số lượng bán",
                        "data": chart_data.get('quantity', []),
                        "type": "line",
                        "borderColor": "#f59e0b",
                        "backgroundColor": "rgba(245, 158, 11, 0.1)",
                        "yAxisID": "y1",
                        "fill": False,
                        "tension": 0.4
                    })
                
                scripts += f"""
                new Chart(document.getElementById('{chart_id}'), {{
                    type: 'bar',
                    data: {{
                        labels: {json.dumps(chart_data.get('labels', []))},
                        datasets: {json.dumps(datasets)}
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{ display: true, position: 'top' }},
                            title: {{ 
                                display: true, 
                                text: 'Top sản phẩm bán chạy',
                                font: {{ size: 18, weight: 'bold' }},
                                padding: {{ top: 10, bottom: 20 }}
                            }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        if (context.dataset.label.includes('Doanh thu')) {{
                                            return 'Doanh thu: ' + new Intl.NumberFormat('vi-VN').format(context.parsed.y) + ' VNĐ';
                                        }} else {{
                                            return 'Số lượng: ' + context.parsed.y + ' sản phẩm';
                                        }}
                                    }}
                                }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                position: 'left',
                                ticks: {{
                                    callback: function(value) {{
                                        return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
                                    }}
                                }},
                                grid: {{ color: 'rgba(0,0,0,0.05)' }}
                            }},
                            {f'''y1: {{
                                type: 'linear',
                                display: true,
                                position: 'right',
                                ticks: {{
                                    callback: function(value) {{
                                        return value + ' sp';
                                    }}
                                }},
                                grid: {{ drawOnChartArea: false }}
                            }},''' if has_quantity else ''}
                            x: {{
                                grid: {{ display: false }},
                                ticks: {{
                                    maxRotation: 45,
                                    minRotation: 45
                                }}
                            }}
                        }}
                    }}
                }});
                """
            else:
                # Default: Bar chart
                scripts += f"""
                new Chart(document.getElementById('{chart_id}'), {{
                    type: 'bar',
                    data: {{
                        labels: {json.dumps(chart_data.get('labels', []))},
                        datasets: [{{
                            label: 'Dữ liệu',
                            data: {json.dumps(chart_data.get('data', []))},
                            backgroundColor: '{chart_data.get('color', '#667eea')}',
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{ display: true }},
                            title: {{ display: true, text: 'Biểu đồ dữ liệu' }}
                        }},
                        scales: {{
                            y: {{ beginAtZero: true }}
                        }}
                    }}
                }});
                """
        
        scripts += "</script>"
        return scripts
    
    def _generate_error_html(self, error_message: str) -> str:
        """Generate error HTML"""
        return f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Lỗi tạo báo cáo</title>
    <style>
        body {{ font-family: Arial, sans-serif; padding: 40px; text-align: center; }}
        .error {{ color: #ef4444; background: #fee2e2; padding: 20px; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="error">
        <h2>❌ Lỗi tạo báo cáo</h2>
        <p>{error_message}</p>
    </div>
</body>
</html>
"""

