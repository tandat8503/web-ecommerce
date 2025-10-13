#!/usr/bin/env python3
"""
Import Shopee Data Script - Import dữ liệu Shopee reviews vào AI system
Chức năng: Import dữ liệu sentiment analysis từ Shopee vào SQLite database
"""

import csv
import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from core.data_manager import DataManager

def import_shopee_data():
    """Import dữ liệu Shopee reviews vào AI system"""
    print("🔄 Importing Shopee reviews data...")
    
    # Initialize DataManager
    dm = DataManager()
    
    # Paths to Shopee data
    shopee_data_dir = Path("../shopee-reviews-sentiment-analysis/data")
    
    if not shopee_data_dir.exists():
        print("❌ Shopee data directory not found!")
        return False
    
    # Files to import
    files_to_import = [
        {
            "file": shopee_data_dir / "train.csv",
            "session_name": "Shopee_Train_Data",
            "description": "Training data with sentiment labels"
        },
        {
            "file": shopee_data_dir / "val.csv", 
            "session_name": "Shopee_Val_Data",
            "description": "Validation data with sentiment labels"
        },
        {
            "file": shopee_data_dir / "automated" / "v3_sentences_pseudo.csv",
            "session_name": "Shopee_Pseudo_Data",
            "description": "Pseudo-labeled data with confidence scores"
        },
        {
            "file": shopee_data_dir / "automated" / "v3_sentences_pseudo_uncertainty.csv",
            "session_name": "Shopee_Uncertainty_Data", 
            "description": "Uncertainty data for active learning"
        }
    ]
    
    total_imported = 0
    
    for file_info in files_to_import:
        file_path = file_info["file"]
        session_name = file_info["session_name"]
        description = file_info["description"]
        
        if not file_path.exists():
            print(f"⚠️ File not found: {file_path}")
            continue
        
        print(f"\n📁 Importing {file_path.name}...")
        print(f"   Description: {description}")
        
        try:
            # Import CSV
            session_id = dm.import_csv(str(file_path), session_name)
            
            # Get imported count
            session_info = dm.get_session_info(session_id)
            imported_count = session_info.get('total_texts', 0)
            
            print(f"✅ Imported {imported_count} texts to session '{session_name}'")
            total_imported += imported_count
            
        except Exception as e:
            print(f"❌ Failed to import {file_path.name}: {e}")
    
    print(f"\n🎉 Total imported: {total_imported} texts")
    return total_imported > 0

def convert_shopee_to_srl_format():
    """Convert Shopee sentiment data to SRL format for training"""
    print("\n🔄 Converting Shopee data to SRL format...")
    
    dm = DataManager()
    
    # Get all sessions
    sessions = dm.get_all_sessions()
    shopee_sessions = [s for s in sessions if s['session_name'].startswith('Shopee_')]
    
    if not shopee_sessions:
        print("❌ No Shopee sessions found!")
        return False
    
    print(f"📊 Found {len(shopee_sessions)} Shopee sessions")
    
    # Process each session
    for session in shopee_sessions:
        session_id = session['id']
        session_name = session['session_name']
        
        print(f"\n🔄 Processing session: {session_name}")
        
        # Get unlabeled texts
        unlabeled_texts = dm.get_unlabeled_texts(session_id)
        
        if not unlabeled_texts:
            print(f"⚠️ No unlabeled texts in {session_name}")
            continue
        
        print(f"📝 Found {len(unlabeled_texts)} texts to process")
        
        # Process each text
        processed_count = 0
        for text_item in unlabeled_texts:
            text = text_item['text']
            raw_data_id = text_item['id']
            
            # Create SRL labels based on sentiment
            labels = create_srl_labels_from_text(text, session_name)
            
            if labels:
                # Save labels
                dm.save_labels(raw_data_id, labels)
                processed_count += 1
        
        print(f"✅ Processed {processed_count} texts with SRL labels")
    
    return True

def create_srl_labels_from_text(text: str, session_name: str) -> list:
    """Create SRL labels from Shopee text based on sentiment"""
    labels = []
    
    # Simple heuristic-based labeling
    text_lower = text.lower()
    
    # Positive sentiment indicators
    positive_words = ['tốt', 'đẹp', 'hài lòng', 'thích', 'ưng ý', 'ok', 'oke', 'recom', 'nên mua']
    negative_words = ['tệ', 'xấu', 'không thích', 'thất vọng', 'kém', 'không ổn']
    
    # Determine sentiment
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    sentiment = 'positive' if positive_count > negative_count else 'negative' if negative_count > positive_count else 'neutral'
    
    # Extract aspects (simple keyword matching)
    aspect_keywords = {
        'quality': ['chất lượng', 'chất liệu', 'vải', 'cao su', 'bền'],
        'price': ['giá', 'rẻ', 'đắt', 'phù hợp'],
        'service': ['shop', 'giao hàng', 'shipper', 'phục vụ', 'tư vấn'],
        'appearance': ['đẹp', 'xấu', 'màu', 'kiểu', 'thiết kế'],
        'comfort': ['thoải mái', 'êm', 'vừa vặn', 'chật', 'rộng']
    }
    
    # Find aspects in text
    for category, keywords in aspect_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                # Find position of keyword
                start_pos = text_lower.find(keyword)
                if start_pos != -1:
                    end_pos = start_pos + len(keyword)
                    
                    labels.append({
                        'role': 'ASPECT',
                        'text': text[start_pos:end_pos],
                        'start': start_pos,
                        'end': end_pos,
                        'emotion': sentiment,
                        'aspectCategory': category,
                        'confidence': 0.8
                    })
    
    # Extract opinions (simple pattern matching)
    opinion_patterns = [
        'rất tốt', 'cực tốt', 'tuyệt vời', 'hoàn hảo',
        'không tốt', 'tệ', 'thất vọng', 'không ổn'
    ]
    
    for pattern in opinion_patterns:
        if pattern in text_lower:
            start_pos = text_lower.find(pattern)
            if start_pos != -1:
                end_pos = start_pos + len(pattern)
                
                labels.append({
                    'role': 'OPINION',
                    'text': text[start_pos:end_pos],
                    'start': start_pos,
                    'end': end_pos,
                    'confidence': 0.9
                })
    
    # Add overall sentiment as MODALITY
    if sentiment != 'neutral':
        labels.append({
            'role': 'MODALITY',
            'text': text,
            'start': 0,
            'end': len(text),
            'confidence': 0.7
        })
    
    return labels

def analyze_imported_data():
    """Analyze imported Shopee data"""
    print("\n📊 Analyzing imported data...")
    
    dm = DataManager()
    
    # Get global statistics
    stats = dm.get_statistics()
    print(f"📈 Global Statistics:")
    print(f"   Total texts: {stats.get('total_texts', 0)}")
    print(f"   Labeled texts: {stats.get('labeled_texts', 0)}")
    print(f"   Total labels: {stats.get('total_labels', 0)}")
    print(f"   Labeling progress: {stats.get('labeling_progress', '0%')}")
    
    # Get session statistics
    sessions = dm.get_all_sessions()
    shopee_sessions = [s for s in sessions if s['session_name'].startswith('Shopee_')]
    
    print(f"\n📋 Shopee Sessions:")
    for session in shopee_sessions:
        session_stats = dm.get_statistics(session['id'])
        print(f"   {session['session_name']}:")
        print(f"     Texts: {session_stats.get('total_texts', 0)}")
        print(f"     Labeled: {session_stats.get('labeled_texts', 0)}")
        print(f"     Labels: {session_stats.get('total_labels', 0)}")
        print(f"     Progress: {session_stats.get('labeling_progress', '0%')}")

def main():
    """Main import function"""
    print("🚀 Starting Shopee Data Import...")
    print("=" * 50)
    
    # Step 1: Import raw data
    print("1️⃣ Importing raw Shopee data...")
    if not import_shopee_data():
        print("❌ Failed to import Shopee data!")
        return False
    
    # Step 2: Convert to SRL format
    print("\n2️⃣ Converting to SRL format...")
    if not convert_shopee_to_srl_format():
        print("❌ Failed to convert to SRL format!")
        return False
    
    # Step 3: Analyze results
    print("\n3️⃣ Analyzing results...")
    analyze_imported_data()
    
    print("\n🎉 Shopee data import completed!")
    print("\nNext steps:")
    print("  - Run 'make train' to train AI models")
    print("  - Use SRL Labeling Tool to refine labels")
    print("  - Test models with 'python scripts/test_system.py'")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
