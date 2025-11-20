#!/usr/bin/env python3
"""
Report Storage Service
Lưu và retrieve generated reports
"""

import json
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import hashlib

logger = logging.getLogger(__name__)

# Reports directory
REPORTS_DIR = Path(__file__).parent.parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


class ReportStorage:
    """Store và retrieve reports"""
    
    def __init__(self):
        self.reports_dir = REPORTS_DIR
        self.metadata_file = self.reports_dir / "metadata.json"
        self._load_metadata()
    
    def _load_metadata(self):
        """Load metadata từ file"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error loading metadata: {e}")
                self.metadata = {}
        else:
            self.metadata = {}
    
    def _save_metadata(self):
        """Save metadata to file"""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
    
    async def save_report(
        self,
        report_id: str,
        html_content: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save report HTML và metadata
        
        Returns:
            Dict với report info (id, url, file_size, etc.)
        """
        try:
            # Save HTML file
            html_file = self.reports_dir / f"{report_id}.html"
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            file_size = html_file.stat().st_size
            
            # Save metadata
            report_metadata = {
                "id": report_id,
                "html_file": str(html_file),
                "file_size": file_size,
                "created_at": datetime.now().isoformat(),
                "report_type": metadata.get("report_type"),
                "period": metadata.get("period"),
                "title": metadata.get("title"),
                **metadata
            }
            
            self.metadata[report_id] = report_metadata
            self._save_metadata()
            
            logger.info(f"Report saved: {report_id} ({file_size} bytes)")
            
            return {
                "report_id": report_id,
                "report_url": f"/api/ai/reports/{report_id}",
                "download_url": f"/api/ai/reports/{report_id}/download",
                "file_size": file_size,
                "created_at": report_metadata["created_at"]
            }
            
        except Exception as e:
            logger.error(f"Error saving report: {e}")
            raise
    
    async def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get report by ID"""
        if report_id not in self.metadata:
            return None
        
        report_meta = self.metadata[report_id]
        html_file = Path(report_meta["html_file"])
        
        if not html_file.exists():
            logger.error(f"Report file not found: {html_file}")
            return None
        
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            return {
                "id": report_id,
                "html": html_content,
                "metadata": report_meta
            }
        except Exception as e:
            logger.error(f"Error reading report: {e}")
            return None
    
    async def list_reports(
        self,
        report_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List reports với optional filter"""
        reports = []
        
        for report_id, meta in self.metadata.items():
            if report_type and meta.get("report_type") != report_type:
                continue
            
            reports.append({
                "id": report_id,
                "title": meta.get("title"),
                "report_type": meta.get("report_type"),
                "period": meta.get("period"),
                "created_at": meta.get("created_at"),
                "file_size": meta.get("file_size")
            })
        
        # Sort by created_at desc
        reports.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return reports[:limit]
    
    async def delete_report(self, report_id: str) -> bool:
        """Delete report"""
        if report_id not in self.metadata:
            return False
        
        try:
            report_meta = self.metadata[report_id]
            html_file = Path(report_meta["html_file"])
            
            # Delete HTML file
            if html_file.exists():
                html_file.unlink()
            
            # Remove from metadata
            del self.metadata[report_id]
            self._save_metadata()
            
            logger.info(f"Report deleted: {report_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting report: {e}")
            return False


# Global storage instance
report_storage = ReportStorage()

