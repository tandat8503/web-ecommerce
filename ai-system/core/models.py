#!/usr/bin/env python3
"""
AI Models - Các mô hình AI cốt lõi
Chức năng: Định nghĩa và quản lý các mô hình AI
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import json
import os
from typing import Dict, List, Any, Tuple
from underthesea import word_tokenize

class SimpleSentimentModel(nn.Module):
    """Model phân tích sentiment đơn giản"""
    
    def __init__(self, vocab_size: int, embedding_dim: int = 128, hidden_dim: int = 256, num_classes: int = 8):
        super(SimpleSentimentModel, self).__init__()
        
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, num_classes)
        )
    
    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        pooled = torch.mean(lstm_out, dim=1)
        output = self.classifier(pooled)
        return output

class SimpleChatbotModel(nn.Module):
    """Model chatbot đơn giản"""
    
    def __init__(self, vocab_size: int, embedding_dim: int = 128, hidden_dim: int = 256, num_intents: int = 7):
        super(SimpleChatbotModel, self).__init__()
        
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(0.3)
        self.intent_classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, num_intents)
        )
    
    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        pooled = torch.mean(lstm_out, dim=1)
        intent_output = self.intent_classifier(pooled)
        return intent_output

class SimpleRecommendationModel(nn.Module):
    """Model recommendation đơn giản"""
    
    def __init__(self, num_users: int, num_items: int, embedding_dim: int = 64, hidden_dim: int = 128):
        super(SimpleRecommendationModel, self).__init__()
        
        self.user_embedding = nn.Embedding(num_users, embedding_dim)
        self.item_embedding = nn.Embedding(num_items, embedding_dim)
        self.dropout = nn.Dropout(0.3)
        self.predictor = nn.Sequential(
            nn.Linear(embedding_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 1)
        )
    
    def forward(self, user_ids, item_ids):
        user_emb = self.user_embedding(user_ids)
        item_emb = self.item_embedding(item_ids)
        combined = torch.cat([user_emb, item_emb], dim=1)
        output = self.predictor(combined)
        return output

class ModelManager:
    """Quản lý các mô hình AI"""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.models = {}
        self.tokenizers = {}
        self.label_encoders = {}
        
        # Tạo thư mục models
        os.makedirs(models_dir, exist_ok=True)
        
        # Định nghĩa labels
        self.sentiment_labels = {
            'joy': 0, 'sadness': 1, 'anticipation': 2, 'anger': 3,
            'optimism': 4, 'surprise': 5, 'fear': 6, 'disgust': 7
        }
        
        self.intent_labels = {
            'greeting': 0, 'product_inquiry': 1, 'price_question': 2,
            'availability': 3, 'shipping': 4, 'warranty': 5, 'goodbye': 6
        }
    
    def create_vocabulary(self, texts: List[str]) -> Dict[str, int]:
        """Tạo từ vựng từ danh sách văn bản"""
        all_words = []
        for text in texts:
            words = word_tokenize(text)
            all_words.extend(words)
        
        vocab = list(set(all_words))
        word_to_idx = {word: idx for idx, word in enumerate(vocab)}
        word_to_idx['<UNK>'] = len(vocab)  # Unknown word
        
        return word_to_idx
    
    def text_to_sequence(self, text: str, word_to_idx: Dict[str, int], max_length: int = 50) -> List[int]:
        """Chuyển đổi văn bản thành sequence số"""
        words = word_tokenize(text)
        sequence = [word_to_idx.get(word, word_to_idx['<UNK>']) for word in words]
        
        # Pad hoặc truncate
        if len(sequence) > max_length:
            sequence = sequence[:max_length]
        else:
            sequence.extend([0] * (max_length - len(sequence)))
        
        return sequence
    
    def train_sentiment_model(self, data: List[Dict], output_dir: str = "models/sentiment") -> Tuple[float, Dict]:
        """Training model sentiment"""
        print("🚀 Training Sentiment Model...")
        
        # Chuẩn bị dữ liệu
        texts = [item['text'] for item in data]
        sentiments = [self.sentiment_labels.get(item['sentiment'], 0) for item in data]
        
        # Tạo vocabulary
        word_to_idx = self.create_vocabulary(texts)
        vocab_size = len(word_to_idx)
        
        # Chuyển đổi dữ liệu
        X = [self.text_to_sequence(text, word_to_idx) for text in texts]
        y = sentiments
        
        X = torch.tensor(X, dtype=torch.long)
        y = torch.tensor(y, dtype=torch.long)
        
        # Tạo model
        model = SimpleSentimentModel(vocab_size=vocab_size, num_classes=8)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        
        # Training loop
        best_accuracy = 0
        train_losses = []
        
        for epoch in range(20):
            model.train()
            total_loss = 0
            
            for i in range(0, len(X), 32):
                batch_X = X[i:i+32]
                batch_y = y[i:i+32]
                
                optimizer.zero_grad()
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            # Validation
            model.eval()
            with torch.no_grad():
                val_outputs = model(X)
                val_pred = torch.argmax(val_outputs, dim=1)
                accuracy = (val_pred == y).float().mean().item()
                
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    # Lưu model
                    os.makedirs(output_dir, exist_ok=True)
                    torch.save(model.state_dict(), os.path.join(output_dir, 'model.pth'))
                    
                    # Lưu tokenizer
                    with open(os.path.join(output_dir, 'tokenizer.json'), 'w') as f:
                        json.dump(word_to_idx, f, indent=2)
            
            train_losses.append(total_loss / len(X))
            print(f"Epoch {epoch+1}/20: Loss={total_loss/len(X):.4f}, Accuracy={accuracy:.4f}")
        
        # Lưu metadata
        metadata = {
            'vocab_size': vocab_size,
            'sentiment_labels': self.sentiment_labels,
            'best_accuracy': best_accuracy,
            'train_losses': train_losses
        }
        
        with open(os.path.join(output_dir, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Sentiment Model trained! Best accuracy: {best_accuracy:.4f}")
        return best_accuracy, metadata
    
    def train_chatbot_model(self, data: List[Dict], output_dir: str = "models/chatbot") -> Tuple[float, Dict]:
        """Training model chatbot"""
        print("🚀 Training Chatbot Model...")
        
        # Chuẩn bị dữ liệu
        texts = [item['text'] for item in data]
        intents = [self.intent_labels.get(item['intent'], 0) for item in data]
        
        # Tạo vocabulary
        word_to_idx = self.create_vocabulary(texts)
        vocab_size = len(word_to_idx)
        
        # Chuyển đổi dữ liệu
        X = [self.text_to_sequence(text, word_to_idx) for text in texts]
        y = intents
        
        X = torch.tensor(X, dtype=torch.long)
        y = torch.tensor(y, dtype=torch.long)
        
        # Tạo model
        model = SimpleChatbotModel(vocab_size=vocab_size, num_intents=7)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        
        # Training loop
        best_accuracy = 0
        train_losses = []
        
        for epoch in range(15):
            model.train()
            total_loss = 0
            
            for i in range(0, len(X), 32):
                batch_X = X[i:i+32]
                batch_y = y[i:i+32]
                
                optimizer.zero_grad()
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            # Validation
            model.eval()
            with torch.no_grad():
                val_outputs = model(X)
                val_pred = torch.argmax(val_outputs, dim=1)
                accuracy = (val_pred == y).float().mean().item()
                
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    # Lưu model
                    os.makedirs(output_dir, exist_ok=True)
                    torch.save(model.state_dict(), os.path.join(output_dir, 'model.pth'))
                    
                    # Lưu tokenizer
                    with open(os.path.join(output_dir, 'tokenizer.json'), 'w') as f:
                        json.dump(word_to_idx, f, indent=2)
            
            train_losses.append(total_loss / len(X))
            print(f"Epoch {epoch+1}/15: Loss={total_loss/len(X):.4f}, Accuracy={accuracy:.4f}")
        
        # Lưu metadata
        metadata = {
            'vocab_size': vocab_size,
            'intent_labels': self.intent_labels,
            'best_accuracy': best_accuracy,
            'train_losses': train_losses
        }
        
        with open(os.path.join(output_dir, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Chatbot Model trained! Best accuracy: {best_accuracy:.4f}")
        return best_accuracy, metadata
    
    def train_recommendation_model(self, data: List[Dict], output_dir: str = "models/recommendation") -> Tuple[float, Dict]:
        """Training model recommendation"""
        print("🚀 Training Recommendation Model...")
        
        # Chuẩn bị dữ liệu
        user_ids = [item['user_id'] for item in data]
        product_ids = [item['product_id'] for item in data]
        ratings = [item['rating'] for item in data]
        
        # Tạo mapping
        unique_users = list(set(user_ids))
        unique_products = list(set(product_ids))
        
        user_to_idx = {user: idx for idx, user in enumerate(unique_users)}
        product_to_idx = {product: idx for idx, product in enumerate(unique_products)}
        
        # Chuyển đổi dữ liệu
        user_ids = [user_to_idx[user] for user in user_ids]
        product_ids = [product_to_idx[product] for product in product_ids]
        
        X_user = torch.tensor(user_ids, dtype=torch.long)
        X_product = torch.tensor(product_ids, dtype=torch.long)
        y = torch.tensor(ratings, dtype=torch.float)
        
        # Tạo model
        model = SimpleRecommendationModel(
            num_users=len(unique_users),
            num_items=len(unique_products)
        )
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.01)
        
        # Training loop
        best_mse = float('inf')
        train_losses = []
        
        for epoch in range(20):
            model.train()
            total_loss = 0
            
            for i in range(0, len(X_user), 32):
                batch_user = X_user[i:i+32]
                batch_product = X_product[i:i+32]
                batch_y = y[i:i+32]
                
                optimizer.zero_grad()
                outputs = model(batch_user, batch_product)
                loss = criterion(outputs.squeeze(), batch_y)
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            # Validation
            model.eval()
            with torch.no_grad():
                val_outputs = model(X_user, X_product)
                mse = criterion(val_outputs.squeeze(), y).item()
                
                if mse < best_mse:
                    best_mse = mse
                    # Lưu model
                    os.makedirs(output_dir, exist_ok=True)
                    torch.save(model.state_dict(), os.path.join(output_dir, 'model.pth'))
                    
                    # Lưu mappings
                    with open(os.path.join(output_dir, 'mappings.json'), 'w') as f:
                        json.dump({
                            'user_to_idx': user_to_idx,
                            'product_to_idx': product_to_idx
                        }, f, indent=2)
            
            train_losses.append(total_loss / len(X_user))
            print(f"Epoch {epoch+1}/20: Loss={total_loss/len(X_user):.4f}, MSE={mse:.4f}")
        
        # Lưu metadata
        metadata = {
            'num_users': len(unique_users),
            'num_items': len(unique_products),
            'best_mse': best_mse,
            'train_losses': train_losses
        }
        
        with open(os.path.join(output_dir, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Recommendation Model trained! Best MSE: {best_mse:.4f}")
        return best_mse, metadata
    
    def load_model(self, model_type: str, model_dir: str) -> Any:
        """Load model đã train"""
        model_path = os.path.join(model_dir, 'model.pth')
        metadata_path = os.path.join(model_dir, 'metadata.json')
        
        if not os.path.exists(model_path) or not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Model not found in {model_dir}")
        
        # Load metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Tạo model
        if model_type == 'sentiment':
            model = SimpleSentimentModel(
                vocab_size=metadata['vocab_size'],
                num_classes=8
            )
        elif model_type == 'chatbot':
            model = SimpleChatbotModel(
                vocab_size=metadata['vocab_size'],
                num_intents=7
            )
        elif model_type == 'recommendation':
            model = SimpleRecommendationModel(
                num_users=metadata['num_users'],
                num_items=metadata['num_items']
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Load weights
        model.load_state_dict(torch.load(model_path, map_location='cpu'))
        model.eval()
        
        return model, metadata
