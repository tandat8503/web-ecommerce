#!/usr/bin/env python3
"""
Web Application - Ứng dụng web chính
Chức năng: Giao diện web để đánh nhãn dữ liệu và quản lý hệ thống
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import DatabaseManager
from core.models import ModelManager

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Khởi tạo managers
db_manager = DatabaseManager()
model_manager = ModelManager()

@app.route('/')
def index():
    """Trang chủ"""
    stats = db_manager.get_statistics()
    return render_template('index.html', stats=stats)

@app.route('/upload')
def upload_page():
    """Trang upload dữ liệu"""
    return render_template('upload.html')

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    """Xử lý upload CSV"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'})
        
        file = request.files['file']
        data_type = request.form.get('data_type', 'sentiment')
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'})
        
        # Đọc file CSV
        import pandas as pd
        df = pd.read_csv(file)
        
        if 'text' not in df.columns:
            return jsonify({'success': False, 'message': 'CSV file must contain "text" column'})
        
        # Thêm dữ liệu vào database
        imported_count = 0
        for index, row in df.iterrows():
            metadata = {}
            for col in df.columns:
                if col != 'text' and pd.notna(row[col]):
                    metadata[col] = str(row[col])
            
            db_manager.add_data(data_type, str(row['text']), metadata)
            imported_count += 1
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {imported_count} samples',
            'imported_count': imported_count
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/labeling/<data_type>')
def labeling_page(data_type):
    """Trang đánh nhãn dữ liệu"""
    if data_type not in ['sentiment', 'chatbot', 'recommendation']:
        return "Invalid data type", 400
    
    # Lấy dữ liệu cần đánh nhãn
    data = db_manager.get_pending_data(data_type, limit=1)
    
    if not data:
        return render_template('no_data.html', data_type=data_type)
    
    # Định nghĩa labels
    sentiment_labels = {
        'joy': {'text': 'Vui vẻ', 'color': '#28a745', 'icon': '😊'},
        'sadness': {'text': 'Buồn bã', 'color': '#6c757d', 'icon': '😢'},
        'anticipation': {'text': 'Mong đợi', 'color': '#ffc107', 'icon': '🤔'},
        'anger': {'text': 'Tức giận', 'color': '#dc3545', 'icon': '😠'},
        'optimism': {'text': 'Lạc quan', 'color': '#17a2b8', 'icon': '😌'},
        'surprise': {'text': 'Bất ngờ', 'color': '#fd7e14', 'icon': '😮'},
        'fear': {'text': 'Sợ hãi', 'color': '#6f42c1', 'icon': '😨'},
        'disgust': {'text': 'Ghê tởm', 'color': '#e83e8c', 'icon': '🤢'}
    }
    
    intent_labels = {
        'greeting': {'text': 'Chào hỏi', 'color': '#007bff'},
        'product_inquiry': {'text': 'Hỏi về sản phẩm', 'color': '#28a745'},
        'price_question': {'text': 'Hỏi về giá', 'color': '#ffc107'},
        'availability': {'text': 'Hỏi về tình trạng hàng', 'color': '#17a2b8'},
        'shipping': {'text': 'Hỏi về giao hàng', 'color': '#6f42c1'},
        'warranty': {'text': 'Hỏi về bảo hành', 'color': '#e83e8c'},
        'goodbye': {'text': 'Chào tạm biệt', 'color': '#6c757d'}
    }
    
    rating_labels = {
        1: {'text': '1 sao - Rất tiêu cực', 'color': '#dc3545'},
        2: {'text': '2 sao - Tiêu cực', 'color': '#fd7e14'},
        3: {'text': '3 sao - Trung tính', 'color': '#ffc107'},
        4: {'text': '4 sao - Tích cực', 'color': '#28a745'},
        5: {'text': '5 sao - Rất tích cực', 'color': '#20c997'}
    }
    
    return render_template('labeling.html',
                         data_type=data_type,
                         data=data,
                         sentiment_labels=sentiment_labels,
                         intent_labels=intent_labels,
                         rating_labels=rating_labels)

@app.route('/submit_sentiment_label', methods=['POST'])
def submit_sentiment_label():
    """Xử lý submit sentiment label"""
    try:
        data = request.json
        raw_data_id = data['raw_data_id']
        sentiment = data['sentiment']
        rating = data['rating']
        confidence = data.get('confidence', 1.0)
        
        label_id = db_manager.add_sentiment_label(raw_data_id, sentiment, rating, confidence)
        
        return jsonify({
            'success': True,
            'message': 'Sentiment label submitted successfully!',
            'label_id': label_id
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

@app.route('/submit_chatbot_label', methods=['POST'])
def submit_chatbot_label():
    """Xử lý submit chatbot label"""
    try:
        data = request.json
        raw_data_id = data['raw_data_id']
        intent = data['intent']
        entities = data.get('entities', {})
        confidence = data.get('confidence', 1.0)
        
        label_id = db_manager.add_chatbot_label(raw_data_id, intent, entities, confidence)
        
        return jsonify({
            'success': True,
            'message': 'Chatbot label submitted successfully!',
            'label_id': label_id
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

@app.route('/submit_recommendation_label', methods=['POST'])
def submit_recommendation_label():
    """Xử lý submit recommendation label"""
    try:
        data = request.json
        raw_data_id = data['raw_data_id']
        user_id = data['user_id']
        product_id = data['product_id']
        rating = data['rating']
        confidence = data.get('confidence', 1.0)
        
        label_id = db_manager.add_recommendation_label(raw_data_id, user_id, product_id, rating, confidence)
        
        return jsonify({
            'success': True,
            'message': 'Recommendation label submitted successfully!',
            'label_id': label_id
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

@app.route('/export/<data_type>')
def export_data(data_type):
    """Export dữ liệu đã đánh nhãn"""
    try:
        labeled_data = db_manager.export_labeled_data(data_type)
        
        # Lưu vào file
        output_path = f'data/exported_{data_type}_labeled.json'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(labeled_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'message': f'Exported {len(labeled_data)} samples',
            'file_path': output_path,
            'download_url': f'/download/{data_type}'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Export error: {str(e)}'
        }), 500

@app.route('/download/<data_type>')
def download_file(data_type):
    """Download file đã export"""
    file_path = f'data/exported_{data_type}_labeled.json'
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return "File not found", 404

@app.route('/train/<model_type>')
def train_model(model_type):
    """Training model"""
    try:
        # Lấy dữ liệu đã đánh nhãn
        labeled_data = db_manager.export_labeled_data(model_type)
        
        if not labeled_data:
            return jsonify({
                'success': False,
                'message': 'No labeled data available for training'
            })
        
        # Training model
        if model_type == 'sentiment':
            accuracy, metadata = model_manager.train_sentiment_model(labeled_data)
            result = {'accuracy': accuracy}
        elif model_type == 'chatbot':
            accuracy, metadata = model_manager.train_chatbot_model(labeled_data)
            result = {'accuracy': accuracy}
        elif model_type == 'recommendation':
            mse, metadata = model_manager.train_recommendation_model(labeled_data)
            result = {'mse': mse}
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid model type'
            })
        
        return jsonify({
            'success': True,
            'message': f'{model_type.title()} model trained successfully!',
            'result': result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Training error: {str(e)}'
        }), 500

@app.route('/api/stats')
def api_stats():
    """API lấy thống kê"""
    stats = db_manager.get_statistics()
    return jsonify(stats)

if __name__ == '__main__':
    # Tạo thư mục templates nếu chưa có
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    os.makedirs('data', exist_ok=True)
    
    print("🚀 Starting AI Labeling Web App...")
    print("📱 Open http://localhost:5000 in your browser")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
