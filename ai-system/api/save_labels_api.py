#!/usr/bin/env python3
"""
Save Labels API - API để lưu labels vào SQLite database
Chức năng: Nhận dữ liệu từ frontend và lưu vào database
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import tempfile
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from core.data_manager import DataManager

app = Flask(__name__)
CORS(app)

# Initialize DataManager
data_manager = DataManager()

@app.route('/api/save-labels', methods=['POST'])
def save_labels():
    """API endpoint để lưu labels vào database"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        texts = data.get('texts', [])
        labels = data.get('labels', [])
        session_name = data.get('session_name', f"Session_{data_manager._get_timestamp()}")
        
        if not texts or not labels:
            return jsonify({
                "success": False,
                "error": "Missing texts or labels"
            }), 400
        
        # Create temporary CSV file
        temp_csv_path = None
        try:
            # Create temporary CSV content
            csv_content = "text\n"
            for text in texts:
                # Escape quotes in text
                escaped_text = text.replace('"', '""')
                csv_content += f'"{escaped_text}"\n'
            
            # Write to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
                f.write(csv_content)
                temp_csv_path = f.name
            
            # Import CSV to get raw_data_ids
            session_id = data_manager.import_csv(temp_csv_path, session_name)
            
            # Get the imported raw_data_ids
            unlabeled_texts = data_manager.get_unlabeled_texts(session_id)
            
            saved_count = 0
            
            # Save labels for each text
            for i, text in enumerate(texts):
                text_labels = labels[i] if i < len(labels) else []
                
                # Find the corresponding raw_data_id
                raw_data_item = None
                for item in unlabeled_texts:
                    if item['text'] == text:
                        raw_data_item = item
                        break
                
                if raw_data_item:
                    # Convert labels to the format expected by DataManager
                    formatted_labels = []
                    for label in text_labels:
                        formatted_label = {
                            'role': label.get('role', ''),
                            'text': label.get('text', ''),
                            'start': label.get('start', 0),
                            'end': label.get('end', 0),
                            'emotion': label.get('emotion'),
                            'aspectCategory': label.get('aspectCategory'),
                            'confidence': label.get('confidence', 1.0)
                        }
                        formatted_labels.append(formatted_label)
                    
                    data_manager.save_labels(raw_data_item['id'], formatted_labels)
                    saved_count += 1
            
            return jsonify({
                "success": True,
                "saved_count": saved_count,
                "session_id": session_id,
                "message": f"Successfully saved {saved_count} labeled texts to database"
            })
            
        finally:
            # Clean up temporary file
            if temp_csv_path and os.path.exists(temp_csv_path):
                os.unlink(temp_csv_path)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Lấy danh sách sessions"""
    try:
        sessions = data_manager.get_all_sessions()
        return jsonify({
            "success": True,
            "sessions": sessions
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/sessions/<int:session_id>', methods=['GET'])
def get_session_info(session_id):
    """Lấy thông tin session"""
    try:
        session_info = data_manager.get_session_info(session_id)
        if not session_info:
            return jsonify({
                "success": False,
                "error": "Session not found"
            }), 404
        
        return jsonify({
            "success": True,
            "session": session_info
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/sessions/<int:session_id>/statistics', methods=['GET'])
def get_session_statistics(session_id):
    """Lấy thống kê session"""
    try:
        stats = data_manager.get_statistics(session_id)
        return jsonify({
            "success": True,
            "statistics": stats
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/sessions/<int:session_id>/export', methods=['GET'])
def export_session(session_id):
    """Export session ra JSON"""
    try:
        output_file = data_manager.export_to_json(session_id)
        return jsonify({
            "success": True,
            "export_file": output_file,
            "message": "Session exported successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/statistics', methods=['GET'])
def get_global_statistics():
    """Lấy thống kê tổng quan"""
    try:
        stats = data_manager.get_statistics()
        return jsonify({
            "success": True,
            "statistics": stats
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Save Labels API Server...")
    print("📍 Available endpoints:")
    print("  - POST /api/save-labels")
    print("  - GET  /api/sessions")
    print("  - GET  /api/sessions/<id>")
    print("  - GET  /api/sessions/<id>/statistics")
    print("  - GET  /api/sessions/<id>/export")
    print("  - GET  /api/statistics")
    print("\n🌐 Server running on http://localhost:5001")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
