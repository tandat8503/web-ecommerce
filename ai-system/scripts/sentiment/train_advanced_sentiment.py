#!/usr/bin/env python3
"""
Advanced Vietnamese Sentiment Training - Xử lý tiếng Việt nâng cao
- Xử lý ký tự đặc biệt, emoji, từ viết tắt
- Phân biệt ngữ cảnh và trạng thái
- Preprocessing tiếng Việt chuyên sâu
- Model ensemble để tăng độ chính xác
"""

import os
import sys
import json
import sqlite3
import re
import unicodedata
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.ensemble import VotingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

DB_PATH = "data/sentiment_training.db"
MODEL_DIR = "models/sentiment/advanced"
MODEL_PATH = f"{MODEL_DIR}/vietnamese_sentiment_model.joblib"
LABEL_MAP = {"negative": 0, "neutral": 1, "positive": 2}
ID2LABEL = {0: "negative", 1: "neutral", 2: "positive"}

# Vietnamese sentiment patterns
VIETNAMESE_PATTERNS = {
    'positive': [
        r'\btốt\b', r'\bđẹp\b', r'\btuyệt\b', r'\bhoàn\s*hảo\b', r'\bchất\s*lượng\b',
        r'\bhài\s*lòng\b', r'\bưng\s*ý\b', r'\bthích\b', r'\byêu\b', r'\bthương\b',
        r'\bgiỏi\b', r'\bgiỏi\s*lắm\b', r'\bquá\s*tốt\b', r'\brất\s*tốt\b', r'\bsiêu\s*tốt\b',
        r'\bperfect\b', r'\bexcellent\b', r'\bamazing\b', r'\bwonderful\b', r'\bfantastic\b',
        r'\b👍\b', r'\b❤️\b', r'\b😍\b', r'\b😊\b', r'\b😄\b', r'\b😁\b'
    ],
    'negative': [
        r'\btệ\b', r'\bxấu\b', r'\btồi\b', r'\btệ\s*hại\b', r'\bkhông\s*tốt\b',
        r'\bkhông\s*hài\s*lòng\b', r'\bthất\s*vọng\b', r'\bchán\b', r'\bghét\b',
        r'\btệ\s*quá\b', r'\brất\s*tệ\b', r'\bsiêu\s*tệ\b', r'\bawful\b', r'\bbad\b',
        r'\bterrible\b', r'\bhorrible\b', r'\bdisappointed\b', r'\b😞\b', r'\b😢\b',
        r'\b😡\b', r'\b👎\b', r'\b💔\b'
    ],
    'neutral': [
        r'\bbình\s*thường\b', r'\bổn\b', r'\btạm\s*được\b', r'\bkhông\s*có\s*gì\b',
        r'\bnormal\b', r'\bok\b', r'\bfine\b', r'\bso\s*so\b', r'\b😐\b', r'\b😑\b'
    ]
}

# Vietnamese abbreviations and slang - Mở rộng để hiểu teencode
VIETNAMESE_SLANG = {
    # Từ viết tắt cơ bản
    'sp': 'sản phẩm', 'mn': 'mọi người', 'ncl': 'nói chung là', 're': 'review',
    'com': 'comment', 'men': 'mình', 'de': 'để', 'd': 'được', 'm': 'mình',
    'n': 'này', 'k': 'không', 'cx': 'cũng', 'dc': 'được', 'vs': 'với',
    'mik': 'mình', 'mk': 'mình', 't': 'tôi', 'e': 'em', 'a': 'anh',
    'c': 'chị', 'b': 'bạn', 'shop': 'cửa hàng', 'ship': 'giao hàng',
    'shipper': 'người giao hàng', 'qte': 'quá trời', 'qtr': 'quá trời',
    
    # Teencode phổ biến
    'ok': 'ok', 'oki': 'ok', 'oke': 'ok', 'okie': 'ok',
    'nma': 'nhưng mà', 'nhm': 'nhưng mà', 'nhma': 'nhưng mà',
    'gac': 'gác', 'gác': 'gác', 'gak': 'gác',
    'dep': 'đẹp', 'dep': 'đẹp', 'xau': 'xấu', 'xau': 'xấu',
    'tot': 'tốt', 'tot': 'tốt', 'te': 'tệ', 'te': 'tệ',
    'ngon': 'ngon', 'ngon': 'ngon', 'ngon': 'ngon',
    're': 'rẻ', 're': 'rẻ', 'dat': 'đắt', 'dat': 'đắt',
    'nhanh': 'nhanh', 'cham': 'chậm', 'cham': 'chậm',
    'dung': 'đúng', 'sai': 'sai', 'dung': 'đúng',
    'hay': 'hay', 'hay': 'hay', 'nhat': 'nhất',
    'nhat': 'nhất', 'cuoi': 'cuối', 'cuoi': 'cuối',
    'dau': 'đầu', 'cuoi': 'cuối', 'giua': 'giữa',
    'tren': 'trên', 'duoi': 'dưới', 'trong': 'trong',
    'ngoai': 'ngoài', 'ben': 'bên', 'canh': 'cạnh',
    
    # Từ cảm thán
    'ui': 'ui', 'oi': 'ôi', 'a': 'à', 'e': 'è',
    'uh': 'ừ', 'um': 'ừm', 'hmm': 'hmm', 'huh': 'huh',
    'wow': 'wow', 'omg': 'omg', 'wtf': 'wtf',
    
    # Từ lóng mạng
    'lol': 'lol', 'haha': 'haha', 'hehe': 'hehe',
    'kkk': 'kkk', 'hihi': 'hihi', 'hoho': 'hoho',
    'yay': 'yay', 'yeah': 'yeah', 'yep': 'yep',
    'nope': 'nope', 'nah': 'nah', 'meh': 'meh',
    
    # Từ ghép thường dùng
    'rat': 'rất', 'qua': 'quá', 'cung': 'cũng',
    'cung': 'cũng', 'rat': 'rất', 'qua': 'quá',
    'sieu': 'siêu', 'cuc': 'cực', 'vo': 'vô',
    'vo': 'vô', 'cung': 'cũng', 'rat': 'rất',
    
    # Từ viết tắt đặc biệt
    'ko': 'không', 'khong': 'không', 'kg': 'không',
    'k': 'không', 'kh': 'không', 'k': 'không',
    'dc': 'được', 'duoc': 'được', 'd': 'được',
    'd': 'được', 'dc': 'được', 'duoc': 'được',
    'cx': 'cũng', 'cung': 'cũng', 'c': 'cũng',
    'c': 'cũng', 'cx': 'cũng', 'cung': 'cũng',
    
    # Từ cảm xúc
    'vui': 'vui', 'buon': 'buồn', 'hanh': 'hạnh',
    'hanh': 'hạnh', 'phuc': 'phúc', 'phuc': 'phúc',
    'thich': 'thích', 'yeu': 'yêu', 'thuong': 'thương',
    'thuong': 'thương', 'ghét': 'ghét', 'ghet': 'ghét',
    'chan': 'chán', 'nhan': 'nhàn', 'nhan': 'nhàn',
    
    # Từ mô tả sản phẩm
    'dep': 'đẹp', 'xau': 'xấu', 'tot': 'tốt', 'te': 'tệ',
    'ngon': 'ngon', 'dở': 'dở', 'do': 'dở', 'do': 'dở',
    're': 'rẻ', 'dat': 'đắt', 'nhanh': 'nhanh', 'cham': 'chậm',
    'dung': 'đúng', 'sai': 'sai', 'hay': 'hay', 'nhat': 'nhất',
    'rat': 'rất', 'qua': 'quá', 'sieu': 'siêu', 'cuc': 'cực',
    'vo': 'vô', 'cung': 'cũng', 'rat': 'rất', 'qua': 'quá'
}

def init_database(db_path: str = DB_PATH) -> None:
    """Khởi tạo database với các bảng cần thiết"""
    os.makedirs(Path(db_path).parent, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        
        # Xóa bảng cũ nếu có
        c.execute("DROP TABLE IF EXISTS sentiment_training_data")
        
        # Bảng dữ liệu training
        c.execute("""
            CREATE TABLE sentiment_training_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                original_text TEXT,
                label INTEGER NOT NULL,
                source_file TEXT,
                confidence REAL DEFAULT 1.0,
                preprocessing_info TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Xóa bảng cũ nếu có
        c.execute("DROP TABLE IF EXISTS model_performance")
        
        # Bảng performance model
        c.execute("""
            CREATE TABLE model_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL,
                accuracy REAL NOT NULL,
                f1_score REAL NOT NULL,
                precision REAL NOT NULL,
                recall REAL NOT NULL,
                training_samples INTEGER NOT NULL,
                validation_samples INTEGER NOT NULL,
                training_time REAL NOT NULL,
                cross_val_scores TEXT,
                confusion_matrix TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Xóa bảng cũ nếu có
        c.execute("DROP TABLE IF EXISTS sentiment_predictions")
        
        # Bảng predictions
        c.execute("""
            CREATE TABLE sentiment_predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                predicted_label INTEGER NOT NULL,
                confidence REAL NOT NULL,
                probabilities TEXT NOT NULL,
                model_used TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()

def normalize_vietnamese_text(text: str) -> str:
    """Chuẩn hóa văn bản tiếng Việt"""
    if not isinstance(text, str):
        return ""
    
    # Xử lý từ ghép có dấu gạch dưới trước
    text = expand_underscore_words(text)
    
    # Loại bỏ ký tự đặc biệt không cần thiết nhưng giữ lại dấu câu quan trọng
    text = re.sub(r'[^\w\s.,!?;:()\-/]', ' ', text)
    
    # Chuẩn hóa khoảng trắng
    text = re.sub(r'\s+', ' ', text)
    
    # Loại bỏ dấu câu thừa
    text = re.sub(r'[.,!?;:]{2,}', lambda m: m.group(0)[0], text)
    
    return text.strip()

def expand_underscore_words(text: str) -> str:
    """Xử lý từ ghép có dấu gạch dưới"""
    # Dictionary các từ ghép phổ biến với dấu gạch dưới
    underscore_words = {
        'sản_phẩm': 'sản phẩm',
        'chất_lượng': 'chất lượng', 
        'thời_gian': 'thời gian',
        'màu_sắc': 'màu sắc',
        'kích_thước': 'kích thước',
        'giá_cả': 'giá cả',
        'giá_thành': 'giá thành',
        'hình_ảnh': 'hình ảnh',
        'mô_tả': 'mô tả',
        'chi_tiết': 'chi tiết',
        'thông_tin': 'thông tin',
        'dịch_vụ': 'dịch vụ',
        'khách_hàng': 'khách hàng',
        'cửa_hàng': 'cửa hàng',
        'giao_hàng': 'giao hàng',
        'thanh_toán': 'thanh toán',
        'đánh_giá': 'đánh giá',
        'phản_hồi': 'phản hồi',
        'hỗ_trợ': 'hỗ trợ',
        'tư_vấn': 'tư vấn',
        'bảo_hiểm': 'bảo hiểm',
        'bảo_quản': 'bảo quản',
        'vận_chuyển': 'vận chuyển',
        'phí_ship': 'phí ship',
        'miễn_phí': 'miễn phí',
        'giảm_giá': 'giảm giá',
        'khuyến_mãi': 'khuyến mãi',
        'ưu_đãi': 'ưu đãi',
        'chương_trình': 'chương trình',
        'sự_kiện': 'sự kiện',
        'tin_tức': 'tin tức',
        'bài_viết': 'bài viết',
        'nội_dung': 'nội dung',
        'chủ_đề': 'chủ đề',
        'danh_mục': 'danh mục',
        'loại_sản_phẩm': 'loại sản phẩm',
        'thương_hiệu': 'thương hiệu',
        'nhãn_hiệu': 'nhãn hiệu',
        'xuất_xứ': 'xuất xứ',
        'nơi_sản_xuất': 'nơi sản xuất',
        'hạn_sử_dụng': 'hạn sử dụng',
        'ngày_sản_xuất': 'ngày sản xuất',
        'trọng_lượng': 'trọng lượng',
        'kích_thước': 'kích thước',
        'chiều_dài': 'chiều dài',
        'chiều_rộng': 'chiều rộng',
        'chiều_cao': 'chiều cao',
        'đường_kính': 'đường kính',
        'chu_vi': 'chu vi',
        'diện_tích': 'diện tích',
        'thể_tích': 'thể tích',
        'dung_lượng': 'dung lượng',
        'công_suất': 'công suất',
        'hiệu_suất': 'hiệu suất',
        'chất_lượng': 'chất lượng',
        'độ_bền': 'độ bền',
        'tuổi_thọ': 'tuổi thọ',
        'thời_gian': 'thời gian',
        'tốc_độ': 'tốc độ',
        'nhiệt_độ': 'nhiệt độ',
        'áp_suất': 'áp suất',
        'độ_ẩm': 'độ ẩm',
        'ánh_sáng': 'ánh sáng',
        'âm_thanh': 'âm thanh',
        'mùi_hương': 'mùi hương',
        'vị_giác': 'vị giác',
        'xúc_giác': 'xúc giác',
        'thị_giác': 'thị giác',
        'thính_giác': 'thính giác',
        'khứu_giác': 'khứu giác',
        'cảm_giác': 'cảm giác',
        'cảm_xúc': 'cảm xúc',
        'tâm_trạng': 'tâm trạng',
        'tinh_thần': 'tinh thần',
        'thể_chất': 'thể chất',
        'sức_khỏe': 'sức khỏe',
        'an_toàn': 'an toàn',
        'tiện_lợi': 'tiện lợi',
        'dễ_dùng': 'dễ dùng',
        'khó_dùng': 'khó dùng',
        'thuận_tiện': 'thuận tiện',
        'bất_tiện': 'bất tiện',
        'hài_lòng': 'hài lòng',
        'thất_vọng': 'thất vọng',
        'ưng_ý': 'ưng ý',
        'không_ưng_ý': 'không ưng ý',
        'thích': 'thích',
        'không_thích': 'không thích',
        'yêu': 'yêu',
        'ghét': 'ghét',
        'quan_tâm': 'quan tâm',
        'không_quan_tâm': 'không quan tâm',
        'chú_ý': 'chú ý',
        'bỏ_qua': 'bỏ qua',
        'quan_trọng': 'quan trọng',
        'không_quan_trọng': 'không quan trọng',
        'cần_thiết': 'cần thiết',
        'không_cần_thiết': 'không cần thiết',
        'hữu_ích': 'hữu ích',
        'vô_ích': 'vô ích',
        'có_ích': 'có ích',
        'không_có_ích': 'không có ích',
        'hiệu_quả': 'hiệu quả',
        'không_hiệu_quả': 'không hiệu quả',
        'thành_công': 'thành công',
        'thất_bại': 'thất bại',
        'tốt': 'tốt',
        'xấu': 'xấu',
        'đẹp': 'đẹp',
        'xấu': 'xấu',
        'hay': 'hay',
        'dở': 'dở',
        'ngon': 'ngon',
        'dở': 'dở',
        'rẻ': 'rẻ',
        'đắt': 'đắt',
        'nhanh': 'nhanh',
        'chậm': 'chậm',
        'đúng': 'đúng',
        'sai': 'sai',
        'chính_xác': 'chính xác',
        'không_chính_xác': 'không chính xác',
        'rõ_ràng': 'rõ ràng',
        'không_rõ_ràng': 'không rõ ràng',
        'dễ_hiểu': 'dễ hiểu',
        'khó_hiểu': 'khó hiểu',
        'đơn_giản': 'đơn giản',
        'phức_tạp': 'phức tạp',
        'dễ_dàng': 'dễ dàng',
        'khó_khăn': 'khó khăn',
        'thuận_lợi': 'thuận lợi',
        'bất_lợi': 'bất lợi',
        'có_lợi': 'có lợi',
        'không_có_lợi': 'không có lợi',
        'có_ích': 'có ích',
        'không_có_ích': 'không có ích',
        'hữu_dụng': 'hữu dụng',
        'vô_dụng': 'vô dụng',
        'cần_thiết': 'cần thiết',
        'không_cần_thiết': 'không cần thiết',
        'quan_trọng': 'quan trọng',
        'không_quan_trọng': 'không quan trọng',
        'cần_thiết': 'cần thiết',
        'không_cần_thiết': 'không cần thiết'
    }
    
    # Thay thế từ ghép có dấu gạch dưới
    for underscore_word, normal_word in underscore_words.items():
        text = text.replace(underscore_word, normal_word)
    
    return text

def expand_vietnamese_slang(text: str) -> str:
    """Mở rộng từ viết tắt tiếng Việt và teencode"""
    words = text.split()
    expanded = []
    
    for word in words:
        # Loại bỏ dấu câu tạm thời
        clean_word = re.sub(r'[^\w]', '', word.lower())
        punctuation = re.sub(r'[\w]', '', word)
        
        # Kiểm tra từ viết tắt
        if clean_word in VIETNAMESE_SLANG:
            expanded_word = VIETNAMESE_SLANG[clean_word] + punctuation
            expanded.append(expanded_word)
        else:
            # Kiểm tra teencode phức tạp hơn
            expanded_word = expand_teencode(clean_word) + punctuation
            expanded.append(expanded_word)
    
    return ' '.join(expanded)

def expand_teencode(word: str) -> str:
    """Xử lý teencode phức tạp"""
    # Giữ nguyên nếu đã là từ chuẩn
    if word in VIETNAMESE_SLANG:
        return VIETNAMESE_SLANG[word]
    
    # Xử lý các pattern teencode phổ biến
    patterns = {
        # Thay thế ký tự
        r'^k$': 'không',
        r'^ko$': 'không', 
        r'^kg$': 'không',
        r'^kh$': 'không',
        r'^dc$': 'được',
        r'^d$': 'được',
        r'^cx$': 'cũng',
        r'^c$': 'cũng',
        r'^vs$': 'với',
        r'^n$': 'này',
        r'^m$': 'mình',
        r'^t$': 'tôi',
        r'^e$': 'em',
        r'^a$': 'anh',
        r'^c$': 'chị',
        r'^b$': 'bạn',
        
        # Từ cảm thán
        r'^ok$': 'ok',
        r'^oki$': 'ok',
        r'^oke$': 'ok',
        r'^okie$': 'ok',
        r'^wow$': 'wow',
        r'^omg$': 'omg',
        r'^lol$': 'lol',
        r'^haha$': 'haha',
        r'^hehe$': 'hehe',
        r'^yay$': 'yay',
        r'^yeah$': 'yeah',
        r'^yep$': 'yep',
        r'^nope$': 'nope',
        r'^nah$': 'nah',
        r'^meh$': 'meh',
        
        # Từ mô tả
        r'^dep$': 'đẹp',
        r'^xau$': 'xấu',
        r'^tot$': 'tốt',
        r'^te$': 'tệ',
        r'^ngon$': 'ngon',
        r'^re$': 'rẻ',
        r'^dat$': 'đắt',
        r'^nhanh$': 'nhanh',
        r'^cham$': 'chậm',
        r'^dung$': 'đúng',
        r'^sai$': 'sai',
        r'^hay$': 'hay',
        r'^nhat$': 'nhất',
        r'^rat$': 'rất',
        r'^qua$': 'quá',
        r'^sieu$': 'siêu',
        r'^cuc$': 'cực',
        r'^vo$': 'vô',
        r'^cung$': 'cũng',
        
        # Từ ghép
        r'^nma$': 'nhưng mà',
        r'^nhm$': 'nhưng mà',
        r'^nhma$': 'nhưng mà',
        r'^gac$': 'gác',
        r'^gak$': 'gác',
        r'^qte$': 'quá trời',
        r'^qtr$': 'quá trời',
        r'^sp$': 'sản phẩm',
        r'^mn$': 'mọi người',
        r'^ncl$': 'nói chung là',
        r'^re$': 'review',
        r'^com$': 'comment',
        r'^men$': 'mình',
        r'^de$': 'để',
        r'^mik$': 'mình',
        r'^mk$': 'mình',
        r'^shop$': 'cửa hàng',
        r'^ship$': 'giao hàng',
        r'^shipper$': 'người giao hàng',
    }
    
    for pattern, replacement in patterns.items():
        if re.match(pattern, word):
            return replacement
    
    # Giữ nguyên nếu không tìm thấy pattern
    return word

def extract_sentiment_features(text: str) -> Dict[str, Any]:
    """Trích xuất đặc trưng sentiment từ văn bản"""
    text_lower = text.lower()
    features = {
        'positive_count': 0,
        'negative_count': 0,
        'neutral_count': 0,
        'exclamation_count': text.count('!'),
        'question_count': text.count('?'),
        'caps_ratio': sum(1 for c in text if c.isupper()) / max(len(text), 1),
        'length': len(text),
        'word_count': len(text.split())
    }
    
    # Đếm pattern sentiment
    for pattern in VIETNAMESE_PATTERNS['positive']:
        features['positive_count'] += len(re.findall(pattern, text_lower))
    
    for pattern in VIETNAMESE_PATTERNS['negative']:
        features['negative_count'] += len(re.findall(pattern, text_lower))
    
    for pattern in VIETNAMESE_PATTERNS['neutral']:
        features['neutral_count'] += len(re.findall(pattern, text_lower))
    
    return features

def preprocess_text(text: str) -> Tuple[str, Dict[str, Any]]:
    """Xử lý văn bản tiếng Việt toàn diện"""
    original_text = text
    
    # Chuẩn hóa cơ bản
    text = normalize_vietnamese_text(text)
    
    # Mở rộng từ viết tắt
    text = expand_vietnamese_slang(text)
    
    # Trích xuất đặc trưng
    features = extract_sentiment_features(text)
    
    return text, features

def load_shopee_data(data_dir: str) -> pd.DataFrame:
    """Tải và xử lý dữ liệu Shopee"""
    data_root = Path(data_dir)
    if not data_root.exists():
        raise FileNotFoundError(f"Data directory not found: {data_root}")

    parts = []
    
    # Load train.csv và val.csv
    for name in ["train.csv", "val.csv"]:
        f = data_root / name
        if f.exists():
            try:
                df = pd.read_csv(f, encoding='utf-8')
                df["source"] = name
                parts.append(df)
                print(f"✅ Loaded {name}: {len(df)} rows")
            except Exception as e:
                print(f"⚠️ Error loading {name}: {e}")
    
    # Load automated/*.csv
    auto_dir = data_root / "automated"
    if auto_dir.exists():
        for f in auto_dir.glob("*.csv"):
            try:
                # Thử đọc với các options khác nhau cho file có vấn đề
                try:
                    df = pd.read_csv(f, encoding='utf-8')
                except pd.errors.ParserError:
                    # Nếu lỗi parsing, thử với options khác
                    df = pd.read_csv(f, encoding='utf-8', sep=None, engine='python', on_bad_lines='skip')
                except Exception:
                    # Cuối cùng thử với delimiter tự động
                    df = pd.read_csv(f, encoding='utf-8', sep=None, engine='python', 
                                   quoting=0, on_bad_lines='skip', error_bad_lines=False)
                
                df["source"] = f.name
                parts.append(df)
                print(f"✅ Loaded {f.name}: {len(df)} rows")
            except Exception as e:
                print(f"⚠️ Error loading {f.name}: {e}")
                # Thử đọc với pandas engine python và bỏ qua dòng lỗi
                try:
                    df = pd.read_csv(f, encoding='utf-8', engine='python', 
                                   on_bad_lines='skip', error_bad_lines=False)
                    df["source"] = f.name
                    parts.append(df)
                    print(f"✅ Loaded {f.name} (with errors skipped): {len(df)} rows")
                except Exception as e2:
                    print(f"❌ Failed to load {f.name}: {e2}")

    if not parts:
        raise ValueError("No CSV files found in the provided directory")

    df_all = pd.concat(parts, ignore_index=True)
    print(f"📊 Total loaded: {len(df_all)} rows")

    # Map text column
    text_col = None
    for col in ["text", "review", "txt"]:
        if col in df_all.columns:
            text_col = col
            break
    
    if text_col is None:
        raise ValueError("No text column found (text/review/txt)")
    
    df_all["original_text"] = df_all[text_col].astype(str)
    
    # Map label column
    label_col = None
    for col in ["label", "sentiment", "lbl"]:
        if col in df_all.columns:
            label_col = col
            break
    
    if label_col is None:
        raise ValueError("No label column found (label/sentiment/lbl)")
    
    df_all["sentiment"] = df_all[label_col]

    # Preprocess text
    print("🔄 Preprocessing texts...")
    processed_data = []
    for idx, row in df_all.iterrows():
        if idx % 1000 == 0:
            print(f"  Processed {idx}/{len(df_all)}")
        
        processed_text, features = preprocess_text(row["original_text"])
        processed_data.append({
            'text': processed_text,
            'original_text': row["original_text"],
            'sentiment': row["sentiment"],
            'source': row["source"],
            'features': features
        })
    
    df_processed = pd.DataFrame(processed_data)
    
    # Map sentiment to 3-class
    def map_sentiment(val):
        if isinstance(val, str):
            v = val.lower().strip()
            if v in {"neg", "negative", "0"}: return "negative"
            if v in {"pos", "positive", "2"}: return "positive"
            if v in {"neu", "neutral", "1"}: return "neutral"
            return "neutral"  # default
        try:
            iv = int(val)
            if iv == 0: return "negative"   # 0 = negative
            if iv == 1: return "neutral"    # 1 = neutral
            if iv == 2: return "positive"   # 2 = positive
        except:
            pass
        return "neutral"
    
    df_processed["sentiment"] = df_processed["sentiment"].apply(map_sentiment)
    
    # Tạo neutral từ uncertainty nếu có
    if "prob_positve" in df_all.columns:
        uncertainty_mask = (df_all["prob_positve"] >= 0.4) & (df_all["prob_positve"] <= 0.6)
        uncertainty_data = []
        for idx, row in df_all[uncertainty_mask].iterrows():
            # Kiểm tra dữ liệu trước khi xử lý
            if pd.isna(row[text_col]) or str(row[text_col]).strip() == "" or str(row[text_col]).lower() == "nan":
                continue
                
            processed_text, features = preprocess_text(row[text_col])
            
            # Kiểm tra kết quả xử lý
            if processed_text == "nan" or processed_text.strip() == "":
                continue
                
            uncertainty_data.append({
                'text': processed_text,
                'original_text': row[text_col],
                'sentiment': 'neutral',
                'source': f"{row.get('source', 'unknown')}_uncertainty",
                'features': features
            })
        
        if uncertainty_data:
            df_uncertainty = pd.DataFrame(uncertainty_data)
            df_processed = pd.concat([df_processed, df_uncertainty], ignore_index=True)
            print(f"✅ Added {len(df_uncertainty)} uncertainty samples as neutral")
        else:
            print("⚠️ No valid uncertainty samples found")

    # Clean data
    print(f"📊 Before cleaning: {len(df_processed)} rows")
    df_processed = df_processed.dropna(subset=["text", "sentiment"])
    print(f"📊 After dropna: {len(df_processed)} rows")
    
    # Loại bỏ dữ liệu lỗi - text = "nan" hoặc chỉ có ký tự đặc biệt
    df_processed = df_processed[df_processed["text"] != "nan"]
    df_processed = df_processed[df_processed["text"] != "NaN"]
    df_processed = df_processed[df_processed["text"] != ""]
    df_processed = df_processed[df_processed["text"].str.strip() != ""]
    print(f"📊 After removing 'nan' and empty: {len(df_processed)} rows")
    
    # Kiểm tra độ dài text trước khi filter
    text_lengths = df_processed["text"].str.len()
    print(f"📊 Text length stats: min={text_lengths.min()}, max={text_lengths.max()}, mean={text_lengths.mean():.2f}")
    print(f"📊 Text length distribution:")
    print(text_lengths.value_counts().head(10))
    
    # Filter nhẹ hơn - chỉ loại bỏ text quá ngắn hoặc chỉ có ký tự đặc biệt
    df_processed = df_processed[df_processed["text"].str.len() > 1]  # Giảm từ 3 xuống 1
    df_processed = df_processed[df_processed["text"].str.strip().str.len() > 0]  # Loại bỏ text chỉ có space
    print(f"📊 After length filter: {len(df_processed)} rows")
    
    print(f"📊 Final dataset: {len(df_processed)} rows")
    print(f"📊 Sentiment distribution:")
    print(df_processed["sentiment"].value_counts())
    
    return df_processed[["text", "original_text", "sentiment", "source", "features"]]

def save_training_data(df: pd.DataFrame, db_path: str = DB_PATH) -> None:
    """Lưu dữ liệu training vào SQLite"""
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        # Chỉ xóa dữ liệu cũ nếu đây là lần đầu tiên
        c.execute("SELECT COUNT(*) FROM sentiment_training_data")
        if c.fetchone()[0] > 0:
            print("⚠️ Database already has data. Appending new data...")
        else:
            print("📝 First time saving data to database...")
        
        rows = []
        for _, row in df.iterrows():
            features_json = json.dumps(row["features"]) if "features" in row else "{}"
            rows.append((
                row["text"],
                row["original_text"],
                LABEL_MAP[row["sentiment"]],
                row["source"],
                1.0,
                features_json
            ))
        
        c.executemany("""
            INSERT INTO sentiment_training_data 
            (text, original_text, label, source_file, confidence, preprocessing_info)
            VALUES (?, ?, ?, ?, ?, ?)
        """, rows)
        conn.commit()
        print(f"✅ Saved {len(rows)} training samples to SQLite")

def build_advanced_model() -> Pipeline:
    """Xây dựng model nâng cao cho tiếng Việt"""
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=100000,
            ngram_range=(1, 3),  # unigram, bigram, trigram
            lowercase=True,
            strip_accents="unicode",
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,  # log scaling
        )),
        ("clf", LogisticRegression(
            random_state=42, 
            max_iter=1000,
            multi_class='ovr',  # One-vs-Rest for multi-class
            class_weight='balanced'  # Handle class imbalance
        ))
    ])

def train_and_evaluate(df: pd.DataFrame, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Training và đánh giá model"""
    print("🔄 Preparing training data...")
    
    # Cân bằng dữ liệu
    counts = df["sentiment"].value_counts()
    print(f"📊 Original distribution: {counts.to_dict()}")
    
    min_count = counts.min()
    balanced_dfs = []
    for sentiment in counts.index:
        sentiment_df = df[df["sentiment"] == sentiment]
        if len(sentiment_df) > min_count:
            balanced_df = sentiment_df.sample(min_count, random_state=42)
        else:
            balanced_df = sentiment_df
        balanced_dfs.append(balanced_df)
    
    balanced_df = pd.concat(balanced_dfs, ignore_index=True)
    print(f"📊 Balanced distribution: {balanced_df['sentiment'].value_counts().to_dict()}")
    
    # Prepare features
    X = balanced_df["text"].tolist()
    y = [LABEL_MAP[s] for s in balanced_df["sentiment"].tolist()]
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"📊 Training samples: {len(X_train)}")
    print(f"📊 Validation samples: {len(X_val)}")
    
    # Build and train model
    print("🔄 Training model...")
    model = build_advanced_model()
    model.fit(X_train, y_train)
    
    # Evaluate
    print("🔄 Evaluating model...")
    y_pred = model.predict(X_val)
    accuracy = accuracy_score(y_val, y_pred)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
    
    # Classification report
    report = classification_report(y_val, y_pred, output_dict=True, zero_division=0)
    
    # Confusion matrix
    cm = confusion_matrix(y_val, y_pred)
    
    # Save model
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_data = {
        "pipeline": model,
        "label_map": LABEL_MAP,
        "id2label": ID2LABEL,
        "preprocessing_info": {
            "vietnamese_patterns": VIETNAMESE_PATTERNS,
            "slang_dict": VIETNAMESE_SLANG
        }
    }
    joblib.dump(model_data, MODEL_PATH)
    
    # Save performance to database
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO model_performance
            (model_name, accuracy, f1_score, precision, recall, training_samples, 
             validation_samples, training_time, cross_val_scores, confusion_matrix)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "advanced-vietnamese-sentiment",
            float(accuracy),
            float(report["macro avg"]["f1-score"]),
            float(report["macro avg"]["precision"]),
            float(report["macro avg"]["recall"]),
            len(X_train),
            len(X_val),
            0.0,  # training time not measured
            json.dumps(cv_scores.tolist()),
            json.dumps(cm.tolist())
        ))
        conn.commit()
    
    print(f"✅ Model trained successfully!")
    print(f"📊 Accuracy: {accuracy:.4f}")
    print(f"📊 Cross-validation scores: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    print(f"💾 Model saved to: {MODEL_PATH}")
    
    return {
        "accuracy": accuracy,
        "cv_scores": cv_scores,
        "report": report,
        "confusion_matrix": cm,
        "model_path": MODEL_PATH
    }

def test_model_predictions(model_path: str, db_path: str = DB_PATH) -> None:
    """Test model với các câu mẫu"""
    print("🔮 Testing model predictions...")
    
    model_data = joblib.load(model_path)
    model = model_data["pipeline"]
    
    test_samples = [
        # Câu chuẩn
        "Sản phẩm rất tốt, chất lượng cao, giao hàng nhanh",
        "Tôi không hài lòng với dịch vụ này, tệ quá",
        "Sản phẩm bình thường, không có gì đặc biệt",
        "Shop phục vụ tốt, shipper thân thiện",
        "Hàng về bị hỏng, rất thất vọng",
        "Quá tuyệt vời! Sẽ mua lại",
        "Không như mong đợi, chất lượng kém",
        "Bình thường thôi, không có gì nổi bật",
        "Tuyệt vời! Rất hài lòng với sản phẩm",
        
        # Teencode và từ viết tắt
        "Sp ok, tạm dc",
        "Nma sp rat tot, giao hang nhanh",
        "K dc, sp te qua",
        "Oki, sp dep nma hoi dat",
        "Sp rat hay, se mua lai",
        "K nhu mong doi, chat luong kem",
        "Sp binh thuong, k co gi dac biet",
        "Shop phuc vu tot, shipper than thien",
        "Hang ve bi hong, rat that vong",
        "Qua tuyet voi! Se mua lai",
        
        # Teencode phức tạp
        "Sp rat tot, chat luong cao, giao hang nhanh",
        "T k hai long vs dich vu nay, te qua",
        "Sp binh thuong, k co gi dac biet",
        "Shop phuc vu tot, shipper than thien",
        "Hang ve bi hong, rat that vong",
        "Sp ok, tam dc",
        "Qua tuyet voi! Se mua lai",
        "K nhu mong doi, chat luong kem",
        "Binh thuong thoi, k co gi noi bat",
        "Tuyet voi! Rat hai long vs sp",
        
        # Từ ghép có dấu gạch dưới
        "Sản_phẩm rất tốt, chất_lượng cao",
        "Dịch_vụ giao_hàng nhanh chóng",
        "Khách_hàng hài_lòng với sản_phẩm",
        "Cửa_hàng phục_vụ tốt, shipper thân_thiện",
        "Hàng về bị hỏng, rất thất_vọng",
        "Sản_phẩm bình_thường, không có gì đặc_biệt",
        "Chất_lượng sản_phẩm kém, giá_cả đắt",
        "Thời_gian giao_hàng chậm, dịch_vụ tệ",
        "Sản_phẩm đẹp, màu_sắc đúng với mô_tả",
        "Kích_thước sản_phẩm phù_hợp, giá_thành hợp_lý"
    ]
    
    with sqlite3.connect(db_path) as conn:
        c = conn.cursor()
        
        for text in test_samples:
            # Preprocess
            processed_text, _ = preprocess_text(text)
            
            # Predict
            pred_proba = model.predict_proba([processed_text])[0]
            pred_label = np.argmax(pred_proba)
            confidence = pred_proba[pred_label]
            
            # Map to 3-class if only 2 classes
            if len(pred_proba) == 2:
                # Binary case: map to 3-class
                if pred_label == 0:  # negative
                    pred_label = 0
                else:  # positive
                    pred_label = 2
                # Add neutral probability
                neutral_prob = 0.1
                pred_proba = np.array([pred_proba[0], neutral_prob, pred_proba[1]])
                pred_proba = pred_proba / pred_proba.sum()  # normalize
            
            # Save prediction
            c.execute("""
                INSERT INTO sentiment_predictions 
                (text, predicted_label, confidence, probabilities, model_used)
                VALUES (?, ?, ?, ?, ?)
            """, (
                text,
                int(pred_label),
                float(confidence),
                json.dumps({ID2LABEL[i]: float(pred_proba[i]) for i in range(len(pred_proba))}),
                "advanced-vietnamese-sentiment"
            ))
            
            print(f"📝 '{text[:50]}...' → {ID2LABEL[pred_label]} ({confidence:.3f})")
        
        conn.commit()
    
    print("✅ Sample predictions saved to database")

def main():
    print("🚀 Advanced Vietnamese Sentiment Training")
    print("=" * 60)
    
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "../shopee-reviews-sentiment-analysis/data"
    print(f"📁 Data directory: {data_dir}")
    
    # Initialize database
    init_database(DB_PATH)
    
    # Load and preprocess data
    df = load_shopee_data(data_dir)
    
    # Save training data
    save_training_data(df, DB_PATH)
    
    # Train model
    results = train_and_evaluate(df, DB_PATH)
    
    # Test predictions
    test_model_predictions(results["model_path"], DB_PATH)
    
    print("\n🎉 Training completed successfully!")
    print(f"📊 Final accuracy: {results['accuracy']:.4f}")
    print(f"💾 Model saved to: {results['model_path']}")
    print(f"💾 Database: {DB_PATH}")

if __name__ == "__main__":
    main()
