#!/usr/bin/env python3
"""
AI Database - Database riêng cho AI system
Chức năng: Lưu trữ dữ liệu riêng của AI (logs, training data, cache)
"""

import os
import sqlite3
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class AIDatabase:
    """Database riêng cho AI system (SQLite)"""
    
    def __init__(self, db_path: str = "ai_data.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Khởi tạo database và tạo bảng"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Bảng conversation logs
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS conversation_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL,
                        user_id TEXT,
                        user_message TEXT NOT NULL,
                        agent_name TEXT NOT NULL,
                        response_text TEXT NOT NULL,
                        confidence REAL,
                        product_validation TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Bảng training data
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS training_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        data_type TEXT NOT NULL,
                        content TEXT NOT NULL,
                        label TEXT,
                        features TEXT,
                        metadata TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Bảng user interactions
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_interactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        interaction_type TEXT NOT NULL,
                        data TEXT NOT NULL,
                        metadata TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Bảng generated reports cache
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS report_cache (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        report_type TEXT NOT NULL,
                        parameters TEXT NOT NULL,
                        file_path TEXT NOT NULL,
                        file_size INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP
                    )
                """)
                
                # Bảng model performance
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS model_performance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        model_name TEXT NOT NULL,
                        metric_name TEXT NOT NULL,
                        metric_value REAL NOT NULL,
                        test_data_size INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                conn.commit()
                logger.info("✅ AI Database initialized successfully")
                
        except Exception as e:
            logger.error(f"❌ Error initializing AI database: {e}")
    
    @contextmanager
    def get_connection(self):
        """Context manager cho database connection"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            yield conn
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    # ===========================
    # CONVERSATION LOGS
    # ===========================
    
    def log_conversation(self, session_id: str, user_id: str, user_message: str, 
                        agent_name: str, response_text: str, confidence: float = None,
                        product_validation: Dict = None) -> int:
        """Lưu log cuộc trò chuyện"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO conversation_logs 
                    (session_id, user_id, user_message, agent_name, response_text, confidence, product_validation)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    session_id, user_id, user_message, agent_name, response_text,
                    confidence, json.dumps(product_validation) if product_validation else None
                ))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error logging conversation: {e}")
            return None
    
    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """Lấy lịch sử cuộc trò chuyện"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM conversation_logs 
                    WHERE session_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?
                """, (session_id, limit))
                
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []
    
    # ===========================
    # TRAINING DATA
    # ===========================
    
    def save_training_data(self, data_type: str, content: str, label: str = None,
                          features: Dict = None, metadata: Dict = None) -> int:
        """Lưu training data"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO training_data 
                    (data_type, content, label, features, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    data_type, content, label,
                    json.dumps(features) if features else None,
                    json.dumps(metadata) if metadata else None
                ))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error saving training data: {e}")
            return None
    
    def get_training_data(self, data_type: str = None, limit: int = 1000) -> List[Dict]:
        """Lấy training data"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                if data_type:
                    cursor.execute("""
                        SELECT * FROM training_data 
                        WHERE data_type = ? 
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """, (data_type, limit))
                else:
                    cursor.execute("""
                        SELECT * FROM training_data 
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """, (limit,))
                
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting training data: {e}")
            return []
    
    # ===========================
    # USER INTERACTIONS
    # ===========================
    
    def log_user_interaction(self, user_id: str, interaction_type: str, 
                           data: Dict, metadata: Dict = None) -> int:
        """Lưu user interaction"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO user_interactions 
                    (user_id, interaction_type, data, metadata)
                    VALUES (?, ?, ?, ?)
                """, (
                    user_id, interaction_type,
                    json.dumps(data),
                    json.dumps(metadata) if metadata else None
                ))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error logging user interaction: {e}")
            return None
    
    def get_user_interactions(self, user_id: str, interaction_type: str = None,
                            limit: int = 100) -> List[Dict]:
        """Lấy user interactions"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                if interaction_type:
                    cursor.execute("""
                        SELECT * FROM user_interactions 
                        WHERE user_id = ? AND interaction_type = ?
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """, (user_id, interaction_type, limit))
                else:
                    cursor.execute("""
                        SELECT * FROM user_interactions 
                        WHERE user_id = ?
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """, (user_id, limit))
                
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting user interactions: {e}")
            return []
    
    # ===========================
    # REPORT CACHE
    # ===========================
    
    def cache_report(self, report_type: str, parameters: Dict, file_path: str,
                    file_size: int = None, expires_at: datetime = None) -> int:
        """Cache báo cáo"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO report_cache 
                    (report_type, parameters, file_path, file_size, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    report_type, json.dumps(parameters), file_path,
                    file_size, expires_at
                ))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error caching report: {e}")
            return None
    
    def get_cached_report(self, report_type: str, parameters: Dict) -> Optional[Dict]:
        """Lấy báo cáo từ cache"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM report_cache 
                    WHERE report_type = ? AND parameters = ? 
                    AND (expires_at IS NULL OR expires_at > datetime('now'))
                    ORDER BY created_at DESC 
                    LIMIT 1
                """, (report_type, json.dumps(parameters)))
                
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting cached report: {e}")
            return None
    
    # ===========================
    # MODEL PERFORMANCE
    # ===========================
    
    def log_model_performance(self, model_name: str, metric_name: str, 
                            metric_value: float, test_data_size: int = None) -> int:
        """Lưu performance metrics"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO model_performance 
                    (model_name, metric_name, metric_value, test_data_size)
                    VALUES (?, ?, ?, ?)
                """, (model_name, metric_name, metric_value, test_data_size))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error logging model performance: {e}")
            return None
    
    def get_model_performance(self, model_name: str = None, 
                            metric_name: str = None) -> List[Dict]:
        """Lấy performance metrics"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                if model_name and metric_name:
                    cursor.execute("""
                        SELECT * FROM model_performance 
                        WHERE model_name = ? AND metric_name = ?
                        ORDER BY created_at DESC
                    """, (model_name, metric_name))
                elif model_name:
                    cursor.execute("""
                        SELECT * FROM model_performance 
                        WHERE model_name = ?
                        ORDER BY created_at DESC
                    """, (model_name,))
                else:
                    cursor.execute("""
                        SELECT * FROM model_performance 
                        ORDER BY created_at DESC
                    """)
                
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting model performance: {e}")
            return []
    
    # ===========================
    # UTILITY METHODS
    # ===========================
    
    def cleanup_old_data(self, days: int = 30):
        """Dọn dẹp dữ liệu cũ"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Xóa conversation logs cũ
                cursor.execute("""
                    DELETE FROM conversation_logs 
                    WHERE created_at < datetime('now', '-{} days')
                """.format(days))
                
                # Xóa expired reports
                cursor.execute("""
                    DELETE FROM report_cache 
                    WHERE expires_at < datetime('now')
                """)
                
                conn.commit()
                logger.info(f"✅ Cleaned up data older than {days} days")
        except Exception as e:
            logger.error(f"Error cleaning up old data: {e}")
    
    def get_database_stats(self) -> Dict:
        """Lấy thống kê database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                stats = {}
                
                # Đếm records trong mỗi bảng
                tables = ['conversation_logs', 'training_data', 'user_interactions', 
                         'report_cache', 'model_performance']
                
                for table in tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    stats[table] = count
                
                # Kích thước database
                cursor.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
                size = cursor.fetchone()[0]
                stats['database_size_bytes'] = size
                
                return stats
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}

# Test function
def test_ai_database():
    """Test AI Database"""
    db = AIDatabase("test_ai.db")
    
    # Test conversation log
    log_id = db.log_conversation(
        session_id="test_session",
        user_id="user123",
        user_message="Test message",
        agent_name="test_agent",
        response_text="Test response",
        confidence=0.8
    )
    print(f"Logged conversation: {log_id}")
    
    # Test training data
    training_id = db.save_training_data(
        data_type="sentiment",
        content="This is great!",
        label="positive",
        features={"word_count": 3, "sentiment_score": 0.8}
    )
    print(f"Saved training data: {training_id}")
    
    # Test stats
    stats = db.get_database_stats()
    print(f"Database stats: {stats}")

if __name__ == "__main__":
    test_ai_database()
