#!/usr/bin/env python3
"""
Database Inspector - Kiểm tra cấu trúc SQLite database
Chức năng: Hiển thị cấu trúc và dữ liệu trong database
"""

import sqlite3
import pandas as pd
from pathlib import Path
import json

def inspect_database(db_path: str = "data/sentiment_training.db"):
    """Kiểm tra cấu trúc và dữ liệu trong database"""
    print("🔍 Database Inspector")
    print("=" * 50)
    
    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        return
    
    print(f"📁 Database: {db_path}")
    print()
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"📊 Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
        print()
        
        # Inspect each table
        for table in tables:
            table_name = table[0]
            print(f"🔍 Table: {table_name}")
            print("-" * 30)
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            print("📋 Schema:")
            for col in columns:
                col_id, name, type_name, not_null, default_val, pk = col
                pk_str = " (PRIMARY KEY)" if pk else ""
                not_null_str = " NOT NULL" if not_null else ""
                default_str = f" DEFAULT {default_val}" if default_val else ""
                print(f"  - {name}: {type_name}{not_null_str}{default_str}{pk_str}")
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            row_count = cursor.fetchone()[0]
            print(f"📊 Rows: {row_count}")
            
            # Show sample data
            if row_count > 0:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
                sample_data = cursor.fetchall()
                
                print("📄 Sample data:")
                for i, row in enumerate(sample_data, 1):
                    print(f"  {i}. {row}")
            
            print()

def show_training_data_stats(db_path: str = "data/sentiment_training.db"):
    """Hiển thị thống kê dữ liệu training"""
    print("📊 Training Data Statistics")
    print("=" * 50)
    
    with sqlite3.connect(db_path) as conn:
        # Total samples
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sentiment_training_data;")
        total_samples = cursor.fetchone()[0]
        print(f"📈 Total training samples: {total_samples}")
        
        # Label distribution
        cursor.execute("""
            SELECT label, COUNT(*) as count 
            FROM sentiment_training_data 
            GROUP BY label 
            ORDER BY label;
        """)
        label_counts = cursor.fetchall()
        
        label_names = {0: "negative", 1: "neutral", 2: "positive"}
        print(f"\n📊 Label distribution:")
        for label_id, count in label_counts:
            label_name = label_names.get(label_id, f"label_{label_id}")
            percentage = (count / total_samples) * 100
            print(f"  - {label_name}: {count:,} ({percentage:.1f}%)")
        
        # Source file distribution
        cursor.execute("""
            SELECT source_file, COUNT(*) as count 
            FROM sentiment_training_data 
            GROUP BY source_file 
            ORDER BY count DESC;
        """)
        source_counts = cursor.fetchall()
        
        print(f"\n📁 Source file distribution:")
        for source_file, count in source_counts:
            percentage = (count / total_samples) * 100
            print(f"  - {source_file}: {count:,} ({percentage:.1f}%)")
        
        # Confidence distribution
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN confidence >= 0.9 THEN 'High (≥0.9)'
                    WHEN confidence >= 0.7 THEN 'Medium (0.7-0.9)'
                    ELSE 'Low (<0.7)'
                END as confidence_level,
                COUNT(*) as count
            FROM sentiment_training_data 
            GROUP BY confidence_level
            ORDER BY confidence;
        """)
        confidence_counts = cursor.fetchall()
        
        print(f"\n🎯 Confidence distribution:")
        for conf_level, count in confidence_counts:
            percentage = (count / total_samples) * 100
            print(f"  - {conf_level}: {count:,} ({percentage:.1f}%)")

def show_model_performance(db_path: str = "data/sentiment_training.db"):
    """Hiển thị performance của models"""
    print("🤖 Model Performance")
    print("=" * 50)
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # Get latest performance
        cursor.execute("""
            SELECT * FROM model_performance 
            ORDER BY created_at DESC 
            LIMIT 1;
        """)
        latest_perf = cursor.fetchone()
        
        if latest_perf:
            print("📊 Latest model performance:")
            print(f"  - Model: {latest_perf[1]}")
            print(f"  - Accuracy: {latest_perf[2]:.4f}")
            print(f"  - F1 Score: {latest_perf[3]:.4f}")
            print(f"  - Precision: {latest_perf[4]:.4f}")
            print(f"  - Recall: {latest_perf[5]:.4f}")
            print(f"  - Training samples: {latest_perf[6]:,}")
            print(f"  - Validation samples: {latest_perf[7]:,}")
            print(f"  - Training time: {latest_perf[8]:.2f} seconds")
            print(f"  - Created at: {latest_perf[9]}")
        else:
            print("❌ No model performance data found")
        
        # Get all performance records
        cursor.execute("""
            SELECT model_name, accuracy, created_at 
            FROM model_performance 
            ORDER BY created_at DESC;
        """)
        all_perf = cursor.fetchall()
        
        if len(all_perf) > 1:
            print(f"\n📈 Performance history ({len(all_perf)} records):")
            for i, (model_name, accuracy, created_at) in enumerate(all_perf[:5], 1):
                print(f"  {i}. {model_name}: {accuracy:.4f} ({created_at})")

def show_predictions_stats(db_path: str = "data/sentiment_training.db"):
    """Hiển thị thống kê predictions"""
    print("🔮 Predictions Statistics")
    print("=" * 50)
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # Total predictions
        cursor.execute("SELECT COUNT(*) FROM sentiment_predictions;")
        total_predictions = cursor.fetchone()[0]
        print(f"📊 Total predictions: {total_predictions}")
        
        if total_predictions > 0:
            # Predicted label distribution
            cursor.execute("""
                SELECT predicted_label, COUNT(*) as count 
                FROM sentiment_predictions 
                GROUP BY predicted_label 
                ORDER BY predicted_label;
            """)
            pred_counts = cursor.fetchall()
            
            label_names = {0: "negative", 1: "neutral", 2: "positive"}
            print(f"\n📊 Predicted label distribution:")
            for label_id, count in pred_counts:
                label_name = label_names.get(label_id, f"label_{label_id}")
                percentage = (count / total_predictions) * 100
                print(f"  - {label_name}: {count:,} ({percentage:.1f}%)")
            
            # Average confidence
            cursor.execute("SELECT AVG(confidence) FROM sentiment_predictions;")
            avg_confidence = cursor.fetchone()[0]
            print(f"\n🎯 Average confidence: {avg_confidence:.4f}")
            
            # Show recent predictions
            cursor.execute("""
                SELECT text, predicted_label, confidence, created_at 
                FROM sentiment_predictions 
                ORDER BY created_at DESC 
                LIMIT 3;
            """)
            recent_preds = cursor.fetchall()
            
            print(f"\n📄 Recent predictions:")
            for i, (text, pred_label, confidence, created_at) in enumerate(recent_preds, 1):
                label_name = label_names.get(pred_label, f"label_{pred_label}")
                print(f"  {i}. [{label_name}] {text[:50]}... (conf: {confidence:.3f})")

def export_database_schema(db_path: str = "data/sentiment_training.db"):
    """Export database schema to JSON"""
    print("📄 Exporting database schema...")
    
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # Get all tables and their schemas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        schema = {}
        for table in tables:
            table_name = table[0]
            
            # Get table info
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            row_count = cursor.fetchone()[0]
            
            schema[table_name] = {
                "columns": [
                    {
                        "name": col[1],
                        "type": col[2],
                        "not_null": bool(col[3]),
                        "default": col[4],
                        "primary_key": bool(col[5])
                    }
                    for col in columns
                ],
                "row_count": row_count
            }
        
        # Save to file
        schema_file = "database_schema.json"
        with open(schema_file, 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Schema exported to {schema_file}")

def main():
    """Main inspection function"""
    import sys
    
    db_path = "data/sentiment_training.db"
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    print(f"🔍 Inspecting database: {db_path}")
    print()
    
    # Inspect database structure
    inspect_database(db_path)
    
    # Show training data stats
    show_training_data_stats(db_path)
    
    # Show model performance
    show_model_performance(db_path)
    
    # Show predictions stats
    show_predictions_stats(db_path)
    
    # Export schema
    export_database_schema(db_path)
    
    print("\n✅ Database inspection completed!")

if __name__ == "__main__":
    main()


