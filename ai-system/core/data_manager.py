#!/usr/bin/env python3
"""
Data Manager - Quản lý dữ liệu đã gán nhãn
Chức năng: Lưu trữ dữ liệu SRL vào SQLite database
"""

import sqlite3
import json
import csv
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

class DataManager:
    """Quản lý dữ liệu đã gán nhãn trong SQLite"""
    
    def __init__(self, db_path: str = "data/labeled_data.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Khởi tạo database và tạo bảng"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Bảng lưu trữ dữ liệu gốc từ CSV
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS raw_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    source_file TEXT,
                    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Bảng lưu trữ labels SRL
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS srl_labels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    raw_data_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    text TEXT NOT NULL,
                    start_pos INTEGER NOT NULL,
                    end_pos INTEGER NOT NULL,
                    emotion TEXT,
                    aspect_category TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (raw_data_id) REFERENCES raw_data (id)
                )
            """)
            
            # Bảng lưu trữ metadata của session gán nhãn
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS labeling_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_name TEXT NOT NULL,
                    source_file TEXT,
                    total_texts INTEGER DEFAULT 0,
                    labeled_texts INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP
                )
            """)
            
            # Bảng lưu trữ training data đã xử lý
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS training_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    aspect_labels TEXT,  -- JSON string
                    opinion_labels TEXT, -- JSON string
                    sentiment_labels TEXT, -- JSON string
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            print(f"✅ Database initialized at {self.db_path}")
    
    def import_csv(self, csv_file_path: str, session_name: str = None) -> int:
        """Import dữ liệu từ CSV file"""
        if not os.path.exists(csv_file_path):
            raise FileNotFoundError(f"CSV file not found: {csv_file_path}")
        
        # Tạo session mới
        session_id = self._create_labeling_session(session_name or f"Session_{datetime.now().strftime('%Y%m%d_%H%M%S')}", csv_file_path)
        
        imported_count = 0
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                # Detect delimiter
                sample = file.read(1024)
                file.seek(0)
                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter
                
                reader = csv.DictReader(file, delimiter=delimiter)
                
                for row in reader:
                    # Tìm cột text (có thể có tên khác nhau)
                    text = None
                    for key in ['text', 'Text', 'TEXT', 'content', 'Content', 'CONTENT']:
                        if key in row and row[key]:
                            text = row[key].strip()
                            break
                    
                    if text:
                        cursor.execute("""
                            INSERT INTO raw_data (text, source_file)
                            VALUES (?, ?)
                        """, (text, os.path.basename(csv_file_path)))
                        imported_count += 1
            
            # Cập nhật session info
            cursor.execute("""
                UPDATE labeling_sessions 
                SET total_texts = ? 
                WHERE id = ?
            """, (imported_count, session_id))
            
            conn.commit()
        
        print(f"✅ Imported {imported_count} texts from {csv_file_path}")
        return session_id
    
    def _create_labeling_session(self, session_name: str, source_file: str) -> int:
        """Tạo session gán nhãn mới"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO labeling_sessions (session_name, source_file)
                VALUES (?, ?)
            """, (session_name, source_file))
            return cursor.lastrowid
    
    def save_labels(self, raw_data_id: int, labels: List[Dict[str, Any]]):
        """Lưu labels cho một text"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Xóa labels cũ nếu có
            cursor.execute("DELETE FROM srl_labels WHERE raw_data_id = ?", (raw_data_id,))
            
            # Lưu labels mới
            for label in labels:
                cursor.execute("""
                    INSERT INTO srl_labels 
                    (raw_data_id, role, text, start_pos, end_pos, emotion, aspect_category, confidence)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    raw_data_id,
                    label.get('role', ''),
                    label.get('text', ''),
                    label.get('start', 0),
                    label.get('end', 0),
                    label.get('emotion'),
                    label.get('aspectCategory'),
                    label.get('confidence', 1.0)
                ))
            
            # Cập nhật session progress
            cursor.execute("""
                UPDATE labeling_sessions 
                SET labeled_texts = (
                    SELECT COUNT(DISTINCT raw_data_id) 
                    FROM srl_labels 
                    WHERE raw_data_id IN (
                        SELECT id FROM raw_data 
                        WHERE source_file = (
                            SELECT source_file FROM labeling_sessions 
                            WHERE id = (
                                SELECT labeling_session_id FROM raw_data WHERE id = ?
                            )
                        )
                    )
                )
                WHERE id = (
                    SELECT labeling_session_id FROM raw_data WHERE id = ?
                )
            """, (raw_data_id, raw_data_id))
            
            conn.commit()
    
    def get_unlabeled_texts(self, session_id: int = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Lấy danh sách text chưa gán nhãn"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if session_id:
                query = """
                    SELECT rd.id, rd.text, rd.imported_at
                    FROM raw_data rd
                    LEFT JOIN srl_labels sl ON rd.id = sl.raw_data_id
                    WHERE rd.source_file = (
                        SELECT source_file FROM labeling_sessions WHERE id = ?
                    )
                    AND sl.raw_data_id IS NULL
                    ORDER BY rd.id
                    LIMIT ?
                """
                cursor.execute(query, (session_id, limit))
            else:
                query = """
                    SELECT rd.id, rd.text, rd.imported_at
                    FROM raw_data rd
                    LEFT JOIN srl_labels sl ON rd.id = sl.raw_data_id
                    WHERE sl.raw_data_id IS NULL
                    ORDER BY rd.id
                    LIMIT ?
                """
                cursor.execute(query, (limit,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def get_labeled_texts(self, session_id: int = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Lấy danh sách text đã gán nhãn"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if session_id:
                query = """
                    SELECT rd.id, rd.text, rd.imported_at,
                           GROUP_CONCAT(
                               json_object(
                                   'role', sl.role,
                                   'text', sl.text,
                                   'start', sl.start_pos,
                                   'end', sl.end_pos,
                                   'emotion', sl.emotion,
                                   'aspectCategory', sl.aspect_category,
                                   'confidence', sl.confidence
                               )
                           ) as labels_json
                    FROM raw_data rd
                    JOIN srl_labels sl ON rd.id = sl.raw_data_id
                    WHERE rd.source_file = (
                        SELECT source_file FROM labeling_sessions WHERE id = ?
                    )
                    GROUP BY rd.id
                    ORDER BY rd.id
                    LIMIT ?
                """
                cursor.execute(query, (session_id, limit))
            else:
                query = """
                    SELECT rd.id, rd.text, rd.imported_at,
                           GROUP_CONCAT(
                               json_object(
                                   'role', sl.role,
                                   'text', sl.text,
                                   'start', sl.start_pos,
                                   'end', sl.end_pos,
                                   'emotion', sl.emotion,
                                   'aspectCategory', sl.aspect_category,
                                   'confidence', sl.confidence
                               )
                           ) as labels_json
                    FROM raw_data rd
                    JOIN srl_labels sl ON rd.id = sl.raw_data_id
                    GROUP BY rd.id
                    ORDER BY rd.id
                    LIMIT ?
                """
                cursor.execute(query, (limit,))
            
            results = []
            for row in cursor.fetchall():
                result = dict(row)
                # Parse labels JSON
                if result['labels_json']:
                    labels = []
                    for label_str in result['labels_json'].split('},'):
                        if label_str.strip():
                            if not label_str.endswith('}'):
                                label_str += '}'
                            try:
                                label = json.loads(label_str)
                                labels.append(label)
                            except json.JSONDecodeError:
                                continue
                    result['labels'] = labels
                else:
                    result['labels'] = []
                results.append(result)
            
            return results
    
    def get_session_info(self, session_id: int) -> Dict[str, Any]:
        """Lấy thông tin session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM labeling_sessions WHERE id = ?
            """, (session_id,))
            
            row = cursor.fetchone()
            return dict(row) if row else {}
    
    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Lấy danh sách tất cả sessions"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM labeling_sessions 
                ORDER BY created_at DESC
            """)
            
            return [dict(row) for row in cursor.fetchall()]
    
    def prepare_training_data(self, session_id: int = None) -> List[Dict[str, Any]]:
        """Chuẩn bị dữ liệu training từ database"""
        labeled_texts = self.get_labeled_texts(session_id, limit=10000)
        
        training_data = []
        for item in labeled_texts:
            # Group labels by role
            aspect_labels = []
            opinion_labels = []
            sentiment_labels = []
            
            for label in item['labels']:
                if label['role'] == 'ASPECT':
                    aspect_labels.append({
                        'text': label['text'],
                        'category': label.get('aspectCategory', 'overall'),
                        'emotion': label.get('emotion', 'joy')
                    })
                elif label['role'] == 'OPINION':
                    opinion_labels.append({
                        'text': label['text'],
                        'sentiment': self._classify_opinion_sentiment(label['text'])
                    })
                elif label['role'] == 'MODALITY':
                    sentiment_labels.append({
                        'text': label['text'],
                        'intensity': self._classify_modality_intensity(label['text'])
                    })
            
            training_data.append({
                'text': item['text'],
                'aspect_labels': aspect_labels,
                'opinion_labels': opinion_labels,
                'sentiment_labels': sentiment_labels
            })
        
        return training_data
    
    def _classify_opinion_sentiment(self, text: str) -> str:
        """Phân loại sentiment của opinion (heuristic)"""
        text_lower = text.lower()
        
        positive_words = ['tốt', 'tuyệt', 'hài lòng', 'thích', 'đẹp', 'chất lượng', 'bền', 'thoải mái']
        negative_words = ['tệ', 'xấu', 'thất vọng', 'không thích', 'kém', 'không thoải mái']
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
    
    def _classify_modality_intensity(self, text: str) -> str:
        """Phân loại intensity của modality (heuristic)"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['rất', 'cực kỳ', 'hoàn toàn', 'tuyệt đối']):
            return 'high'
        elif any(word in text_lower for word in ['khá', 'tương đối', 'khá là']):
            return 'medium'
        else:
            return 'low'
    
    def export_to_json(self, session_id: int = None, output_file: str = None) -> str:
        """Export dữ liệu đã gán nhãn ra JSON file"""
        labeled_texts = self.get_labeled_texts(session_id, limit=10000)
        
        export_data = []
        for item in labeled_texts:
            export_data.append({
                'text': item['text'],
                'labels': item['labels']
            })
        
        if not output_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f"data/export_{timestamp}.json"
        
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Exported {len(export_data)} labeled texts to {output_file}")
        return output_file
    
    def _get_timestamp(self) -> str:
        """Lấy timestamp hiện tại"""
        return datetime.now().strftime('%Y%m%d_%H%M%S')
    
    def get_statistics(self, session_id: int = None) -> Dict[str, Any]:
        """Lấy thống kê dữ liệu"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if session_id:
                # Session-specific stats
                cursor.execute("""
                    SELECT 
                        COUNT(DISTINCT rd.id) as total_texts,
                        COUNT(DISTINCT sl.raw_data_id) as labeled_texts,
                        COUNT(sl.id) as total_labels,
                        COUNT(CASE WHEN sl.role = 'ASPECT' THEN 1 END) as aspect_labels,
                        COUNT(CASE WHEN sl.role = 'OPINION' THEN 1 END) as opinion_labels,
                        COUNT(CASE WHEN sl.role = 'HOLDER' THEN 1 END) as holder_labels,
                        COUNT(CASE WHEN sl.role = 'MODALITY' THEN 1 END) as modality_labels
                    FROM raw_data rd
                    LEFT JOIN srl_labels sl ON rd.id = sl.raw_data_id
                    WHERE rd.source_file = (
                        SELECT source_file FROM labeling_sessions WHERE id = ?
                    )
                """, (session_id,))
            else:
                # Global stats
                cursor.execute("""
                    SELECT 
                        COUNT(DISTINCT rd.id) as total_texts,
                        COUNT(DISTINCT sl.raw_data_id) as labeled_texts,
                        COUNT(sl.id) as total_labels,
                        COUNT(CASE WHEN sl.role = 'ASPECT' THEN 1 END) as aspect_labels,
                        COUNT(CASE WHEN sl.role = 'OPINION' THEN 1 END) as opinion_labels,
                        COUNT(CASE WHEN sl.role = 'HOLDER' THEN 1 END) as holder_labels,
                        COUNT(CASE WHEN sl.role = 'MODALITY' THEN 1 END) as modality_labels
                    FROM raw_data rd
                    LEFT JOIN srl_labels sl ON rd.id = sl.raw_data_id
                """)
            
            row = cursor.fetchone()
            if row:
                return {
                    'total_texts': row[0],
                    'labeled_texts': row[1],
                    'total_labels': row[2],
                    'aspect_labels': row[3],
                    'opinion_labels': row[4],
                    'holder_labels': row[5],
                    'modality_labels': row[6],
                    'labeling_progress': f"{(row[1] / row[0] * 100):.1f}%" if row[0] > 0 else "0%"
                }
            else:
                return {}

if __name__ == "__main__":
    # Test DataManager
    dm = DataManager()
    
    # Test import CSV
    print("🧪 Testing DataManager...")
    
    # Create sample CSV
    sample_csv = "data/sample_data.csv"
    os.makedirs("data", exist_ok=True)
    
    with open(sample_csv, 'w', encoding='utf-8') as f:
        f.write("text\n")
        f.write("Tôi rất hài lòng với chất lượng bàn làm việc này\n")
        f.write("Ghế văn phòng không thoải mái như tôi mong đợi\n")
        f.write("Dịch vụ giao hàng nhanh chóng, nhân viên tư vấn nhiệt tình\n")
    
    # Import CSV
    session_id = dm.import_csv(sample_csv, "Test Session")
    print(f"✅ Created session {session_id}")
    
    # Get unlabeled texts
    unlabeled = dm.get_unlabeled_texts(session_id)
    print(f"📝 Found {len(unlabeled)} unlabeled texts")
    
    # Get statistics
    stats = dm.get_statistics(session_id)
    print(f"📊 Statistics: {stats}")
    
    print("✅ DataManager test completed!")
