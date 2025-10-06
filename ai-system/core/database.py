#!/usr/bin/env python3
"""
Database Manager - Quản lý cơ sở dữ liệu
Chức năng: Lưu trữ và quản lý dữ liệu đánh nhãn
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

class DatabaseManager:
    """Quản lý cơ sở dữ liệu cho hệ thống AI"""
    
    def __init__(self, db_path: str = "data/ai_system.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Khởi tạo cơ sở dữ liệu"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Bảng dữ liệu thô
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS raw_data (
            id TEXT PRIMARY KEY,
            data_type TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending'
        )
        ''')
        
        # Bảng đánh nhãn sentiment
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sentiment_labels (
            id TEXT PRIMARY KEY,
            raw_data_id TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            rating INTEGER NOT NULL,
            confidence REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (raw_data_id) REFERENCES raw_data (id)
        )
        ''')
        
        # Bảng đánh nhãn chatbot
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS chatbot_labels (
            id TEXT PRIMARY KEY,
            raw_data_id TEXT NOT NULL,
            intent TEXT NOT NULL,
            entities TEXT,
            confidence REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (raw_data_id) REFERENCES raw_data (id)
        )
        ''')
        
        # Bảng đánh nhãn recommendation
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendation_labels (
            id TEXT PRIMARY KEY,
            raw_data_id TEXT NOT NULL,
            user_id TEXT,
            product_id TEXT,
            rating INTEGER NOT NULL,
            confidence REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (raw_data_id) REFERENCES raw_data (id)
        )
        ''')
        
        conn.commit()
        conn.close()
        print("✅ Database initialized successfully!")
    
    def add_data(self, data_type: str, content: str, metadata: Dict = None) -> str:
        """Thêm dữ liệu mới"""
        import uuid
        data_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO raw_data (id, data_type, content, metadata)
        VALUES (?, ?, ?, ?)
        ''', (data_id, data_type, content, json.dumps(metadata or {})))
        
        conn.commit()
        conn.close()
        
        return data_id
    
    def add_sentiment_label(self, raw_data_id: str, sentiment: str, rating: int, confidence: float = 1.0) -> str:
        """Thêm nhãn sentiment"""
        import uuid
        label_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO sentiment_labels (id, raw_data_id, sentiment, rating, confidence)
        VALUES (?, ?, ?, ?, ?)
        ''', (label_id, raw_data_id, sentiment, rating, confidence))
        
        # Cập nhật status
        cursor.execute('''
        UPDATE raw_data SET status = 'labeled' WHERE id = ?
        ''', (raw_data_id,))
        
        conn.commit()
        conn.close()
        
        return label_id
    
    def add_chatbot_label(self, raw_data_id: str, intent: str, entities: Dict = None, confidence: float = 1.0) -> str:
        """Thêm nhãn chatbot"""
        import uuid
        label_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO chatbot_labels (id, raw_data_id, intent, entities, confidence)
        VALUES (?, ?, ?, ?, ?)
        ''', (label_id, raw_data_id, intent, json.dumps(entities or {}), confidence))
        
        # Cập nhật status
        cursor.execute('''
        UPDATE raw_data SET status = 'labeled' WHERE id = ?
        ''', (raw_data_id,))
        
        conn.commit()
        conn.close()
        
        return label_id
    
    def add_recommendation_label(self, raw_data_id: str, user_id: str, product_id: str, rating: int, confidence: float = 1.0) -> str:
        """Thêm nhãn recommendation"""
        import uuid
        label_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO recommendation_labels (id, raw_data_id, user_id, product_id, rating, confidence)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (label_id, raw_data_id, user_id, product_id, rating, confidence))
        
        # Cập nhật status
        cursor.execute('''
        UPDATE raw_data SET status = 'labeled' WHERE id = ?
        ''', (raw_data_id,))
        
        conn.commit()
        conn.close()
        
        return label_id
    
    def get_pending_data(self, data_type: str, limit: int = 1) -> Optional[Dict]:
        """Lấy dữ liệu cần đánh nhãn"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, content, metadata FROM raw_data 
        WHERE data_type = ? AND status = 'pending'
        ORDER BY created_at ASC
        LIMIT ?
        ''', (data_type, limit))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'id': result[0],
                'content': result[1],
                'metadata': json.loads(result[2]) if result[2] else {}
            }
        return None
    
    def get_statistics(self) -> Dict:
        """Lấy thống kê hệ thống"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        stats = {}
        
        # Đếm theo data type
        cursor.execute('''
        SELECT data_type, status, COUNT(*) 
        FROM raw_data 
        GROUP BY data_type, status
        ''')
        
        for row in cursor.fetchall():
            data_type, status, count = row
            if data_type not in stats:
                stats[data_type] = {}
            stats[data_type][status] = count
        
        # Đếm labels
        cursor.execute('SELECT COUNT(*) FROM sentiment_labels')
        stats['sentiment_labels'] = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM chatbot_labels')
        stats['chatbot_labels'] = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM recommendation_labels')
        stats['recommendation_labels'] = cursor.fetchone()[0]
        
        conn.close()
        return stats
    
    def export_labeled_data(self, data_type: str) -> List[Dict]:
        """Export dữ liệu đã đánh nhãn"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if data_type == 'sentiment':
            cursor.execute('''
            SELECT r.content, s.sentiment, s.rating, r.metadata
            FROM raw_data r
            JOIN sentiment_labels s ON r.id = s.raw_data_id
            WHERE r.data_type = 'sentiment'
            ''')
            
            data = []
            for row in cursor.fetchall():
                data.append({
                    'text': row[0],
                    'sentiment': row[1],
                    'rating': row[2],
                    'metadata': json.loads(row[3]) if row[3] else {}
                })
        
        elif data_type == 'chatbot':
            cursor.execute('''
            SELECT r.content, c.intent, c.entities, r.metadata
            FROM raw_data r
            JOIN chatbot_labels c ON r.id = c.raw_data_id
            WHERE r.data_type = 'chatbot'
            ''')
            
            data = []
            for row in cursor.fetchall():
                data.append({
                    'text': row[0],
                    'intent': row[1],
                    'entities': json.loads(row[2]) if row[2] else {},
                    'metadata': json.loads(row[3]) if row[3] else {}
                })
        
        elif data_type == 'recommendation':
            cursor.execute('''
            SELECT r.content, rec.user_id, rec.product_id, rec.rating, r.metadata
            FROM raw_data r
            JOIN recommendation_labels rec ON r.id = rec.raw_data_id
            WHERE r.data_type = 'recommendation'
            ''')
            
            data = []
            for row in cursor.fetchall():
                data.append({
                    'text': row[0],
                    'user_id': row[1],
                    'product_id': row[2],
                    'rating': row[3],
                    'metadata': json.loads(row[4]) if row[4] else {}
                })
        
        conn.close()
        return data

