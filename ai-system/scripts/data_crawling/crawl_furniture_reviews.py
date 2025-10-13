#!/usr/bin/env python3
"""
Furniture Reviews Crawler - Thu thập dữ liệu review sản phẩm nội thất
Các website: noithatviet.vn, ikea.com.vn, lazada.vn, shopee.vn
"""

import requests
import time
import json
import csv
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import pandas as pd
from datetime import datetime
import random
from typing import List, Dict, Any
import sqlite3

class FurnitureReviewCrawler:
    """Crawler cho reviews sản phẩm nội thất"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        self.reviews_data = []
        self.delay_range = (1, 3)  # Random delay between requests
        
    def random_delay(self):
        """Random delay để tránh bị block"""
        delay = random.uniform(*self.delay_range)
        time.sleep(delay)
        
    def clean_text(self, text: str) -> str:
        """Làm sạch text review"""
        if not text:
            return ""
        
        # Loại bỏ HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Loại bỏ ký tự đặc biệt
        text = re.sub(r'[^\w\s.,!?;:()\-/]', ' ', text)
        
        # Chuẩn hóa khoảng trắng
        text = re.sub(r'\s+', ' ', text)
        
        # Loại bỏ dấu câu thừa
        text = re.sub(r'[.,!?;:]{2,}', lambda m: m.group(0)[0], text)
        
        return text.strip()
    
    def crawl_noithatviet(self, max_pages: int = 5) -> List[Dict]:
        """Crawl reviews từ noithatviet.vn"""
        print("🔄 Crawling noithatviet.vn...")
        reviews = []
        
        try:
            # Danh sách các category sản phẩm nội thất
            categories = [
                "ban-lam-viec",
                "ghe-van-phong", 
                "tu-sach",
                "ban-an",
                "ghe-an",
                "sofa",
                "giuong",
                "tu-quan-ao"
            ]
            
            for category in categories:
                print(f"  📁 Crawling category: {category}")
                
                for page in range(1, max_pages + 1):
                    url = f"https://noithatviet.vn/{category}?page={page}"
                    
                    try:
                        response = self.session.get(url, timeout=10)
                        response.raise_for_status()
                        
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # Tìm các sản phẩm
                        products = soup.find_all('div', class_='product-item')
                        
                        if not products:
                            print(f"    ⚠️ No products found on page {page}")
                            break
                            
                        for product in products:
                            # Lấy link sản phẩm
                            product_link = product.find('a', href=True)
                            if not product_link:
                                continue
                                
                            product_url = urljoin(url, product_link['href'])
                            
                            # Crawl reviews của sản phẩm
                            product_reviews = self.crawl_product_reviews_noithatviet(product_url)
                            reviews.extend(product_reviews)
                            
                        self.random_delay()
                        
                    except Exception as e:
                        print(f"    ❌ Error crawling page {page}: {e}")
                        continue
                        
        except Exception as e:
            print(f"❌ Error crawling noithatviet.vn: {e}")
            
        print(f"✅ Crawled {len(reviews)} reviews from noithatviet.vn")
        return reviews
    
    def crawl_product_reviews_noithatviet(self, product_url: str) -> List[Dict]:
        """Crawl reviews của một sản phẩm cụ thể"""
        reviews = []
        
        try:
            response = self.session.get(product_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm tên sản phẩm
            product_name = ""
            title_elem = soup.find('h1', class_='product-title')
            if title_elem:
                product_name = self.clean_text(title_elem.get_text())
            
            # Tìm các review
            review_elements = soup.find_all('div', class_='review-item')
            
            for review_elem in review_elements:
                # Lấy nội dung review
                content_elem = review_elem.find('div', class_='review-content')
                if not content_elem:
                    continue
                    
                content = self.clean_text(content_elem.get_text())
                if len(content) < 10:  # Bỏ qua review quá ngắn
                    continue
                
                # Lấy tên người review
                author_elem = review_elem.find('div', class_='review-author')
                author = ""
                if author_elem:
                    author = self.clean_text(author_elem.get_text())
                
                # Lấy rating (nếu có)
                rating = 0
                rating_elem = review_elem.find('div', class_='rating')
                if rating_elem:
                    stars = rating_elem.find_all('i', class_='fa-star')
                    rating = len(stars)
                
                # Xác định sentiment từ rating
                sentiment = "neutral"
                if rating >= 4:
                    sentiment = "positive"
                elif rating <= 2:
                    sentiment = "negative"
                
                review_data = {
                    'content': content,
                    'author': author,
                    'rating': rating,
                    'sentiment': sentiment,
                    'product_name': product_name,
                    'source': 'noithatviet.vn',
                    'url': product_url,
                    'crawled_at': datetime.now().isoformat()
                }
                
                reviews.append(review_data)
                
        except Exception as e:
            print(f"    ❌ Error crawling product {product_url}: {e}")
            
        return reviews
    
    def crawl_shopee_furniture(self, max_pages: int = 3) -> List[Dict]:
        """Crawl reviews từ Shopee - category nội thất"""
        print("🔄 Crawling Shopee furniture reviews...")
        reviews = []
        
        try:
            # Shopee furniture category IDs
            categories = [
                "11036032",  # Bàn làm việc
                "11036033",  # Ghế văn phòng
                "11036034",  # Tủ sách
                "11036035",  # Bàn ăn
                "11036036",  # Ghế ăn
                "11036037",  # Sofa
                "11036038",  # Giường
                "11036039"   # Tủ quần áo
            ]
            
            for category_id in categories:
                print(f"  📁 Crawling Shopee category: {category_id}")
                
                for page in range(1, max_pages + 1):
                    url = f"https://shopee.vn/api/v4/search/search_items?by=relevancy&category={category_id}&limit=50&newest={page * 50}&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2"
                    
                    try:
                        response = self.session.get(url, timeout=10)
                        response.raise_for_status()
                        
                        data = response.json()
                        items = data.get('items', [])
                        
                        if not items:
                            print(f"    ⚠️ No items found on page {page}")
                            break
                            
                        for item in items:
                            item_id = item.get('itemid')
                            shop_id = item.get('shopid')
                            
                            if item_id and shop_id:
                                # Crawl reviews của sản phẩm
                                item_reviews = self.crawl_shopee_product_reviews(item_id, shop_id)
                                reviews.extend(item_reviews)
                            
                        self.random_delay()
                        
                    except Exception as e:
                        print(f"    ❌ Error crawling Shopee page {page}: {e}")
                        continue
                        
        except Exception as e:
            print(f"❌ Error crawling Shopee: {e}")
            
        print(f"✅ Crawled {len(reviews)} reviews from Shopee")
        return reviews
    
    def crawl_shopee_product_reviews(self, item_id: int, shop_id: int) -> List[Dict]:
        """Crawl reviews của một sản phẩm Shopee"""
        reviews = []
        
        try:
            # API endpoint để lấy reviews
            url = f"https://shopee.vn/api/v2/item/get_ratings?itemid={item_id}&shopid={shop_id}&limit=20&offset=0"
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            ratings = data.get('data', {}).get('ratings', [])
            
            for rating in ratings:
                content = rating.get('comment', '')
                if not content or len(content) < 10:
                    continue
                    
                content = self.clean_text(content)
                
                # Lấy rating
                rating_score = rating.get('rating_star', 0)
                
                # Xác định sentiment
                sentiment = "neutral"
                if rating_score >= 4:
                    sentiment = "positive"
                elif rating_score <= 2:
                    sentiment = "negative"
                
                review_data = {
                    'content': content,
                    'author': rating.get('user_name', ''),
                    'rating': rating_score,
                    'sentiment': sentiment,
                    'product_name': f"Shopee Item {item_id}",
                    'source': 'shopee.vn',
                    'url': f"https://shopee.vn/product/{shop_id}/{item_id}",
                    'crawled_at': datetime.now().isoformat()
                }
                
                reviews.append(review_data)
                
        except Exception as e:
            print(f"    ❌ Error crawling Shopee product {item_id}: {e}")
            
        return reviews
    
    def crawl_lazada_furniture(self, max_pages: int = 3) -> List[Dict]:
        """Crawl reviews từ Lazada - category nội thất"""
        print("🔄 Crawling Lazada furniture reviews...")
        reviews = []
        
        try:
            # Lazada furniture search URLs
            search_urls = [
                "https://www.lazada.vn/catalog/?q=bàn+làm+việc&_keyori=ss&from=input&spm=a2o4n.searchlist.search.go",
                "https://www.lazada.vn/catalog/?q=ghế+văn+phòng&_keyori=ss&from=input&spm=a2o4n.searchlist.search.go",
                "https://www.lazada.vn/catalog/?q=tủ+sách&_keyori=ss&from=input&spm=a2o4n.searchlist.search.go",
                "https://www.lazada.vn/catalog/?q=bàn+ăn&_keyori=ss&from=input&spm=a2o4n.searchlist.search.go",
                "https://www.lazada.vn/catalog/?q=sofa&_keyori=ss&from=input&spm=a2o4n.searchlist.search.go"
            ]
            
            for search_url in search_urls:
                print(f"  🔍 Crawling search: {search_url}")
                
                try:
                    response = self.session.get(search_url, timeout=10)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Tìm các sản phẩm
                    products = soup.find_all('div', {'data-qa-locator': 'product-item'})
                    
                    for product in products[:10]:  # Giới hạn 10 sản phẩm mỗi search
                        # Lấy link sản phẩm
                        product_link = product.find('a', href=True)
                        if not product_link:
                            continue
                            
                        product_url = urljoin(search_url, product_link['href'])
                        
                        # Crawl reviews của sản phẩm
                        product_reviews = self.crawl_lazada_product_reviews(product_url)
                        reviews.extend(product_reviews)
                        
                    self.random_delay()
                    
                except Exception as e:
                    print(f"    ❌ Error crawling Lazada search: {e}")
                    continue
                    
        except Exception as e:
            print(f"❌ Error crawling Lazada: {e}")
            
        print(f"✅ Crawled {len(reviews)} reviews from Lazada")
        return reviews
    
    def crawl_lazada_product_reviews(self, product_url: str) -> List[Dict]:
        """Crawl reviews của một sản phẩm Lazada"""
        reviews = []
        
        try:
            response = self.session.get(product_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm tên sản phẩm
            product_name = ""
            title_elem = soup.find('h1', class_='pdp-product-name')
            if title_elem:
                product_name = self.clean_text(title_elem.get_text())
            
            # Tìm các review
            review_elements = soup.find_all('div', class_='review-item')
            
            for review_elem in review_elements:
                # Lấy nội dung review
                content_elem = review_elem.find('div', class_='review-content')
                if not content_elem:
                    continue
                    
                content = self.clean_text(content_elem.get_text())
                if len(content) < 10:
                    continue
                
                # Lấy rating
                rating = 0
                rating_elem = review_elem.find('div', class_='rating')
                if rating_elem:
                    stars = rating_elem.find_all('i', class_='fa-star')
                    rating = len(stars)
                
                # Xác định sentiment
                sentiment = "neutral"
                if rating >= 4:
                    sentiment = "positive"
                elif rating <= 2:
                    sentiment = "negative"
                
                review_data = {
                    'content': content,
                    'author': '',
                    'rating': rating,
                    'sentiment': sentiment,
                    'product_name': product_name,
                    'source': 'lazada.vn',
                    'url': product_url,
                    'crawled_at': datetime.now().isoformat()
                }
                
                reviews.append(review_data)
                
        except Exception as e:
            print(f"    ❌ Error crawling Lazada product {product_url}: {e}")
            
        return reviews
    
    def save_to_database(self, reviews: List[Dict], db_path: str = "data/sentiment_training.db"):
        """Lưu reviews vào SQLite database"""
        print(f"💾 Saving {len(reviews)} reviews to database...")
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Tạo bảng nếu chưa có
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS crawled_reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    author TEXT,
                    rating INTEGER,
                    sentiment TEXT NOT NULL,
                    product_name TEXT,
                    source TEXT NOT NULL,
                    url TEXT,
                    crawled_at TIMESTAMP,
                    processed BOOLEAN DEFAULT FALSE
                )
            """)
            
            # Insert reviews
            for review in reviews:
                cursor.execute("""
                    INSERT INTO crawled_reviews 
                    (content, author, rating, sentiment, product_name, source, url, crawled_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    review['content'],
                    review['author'],
                    review['rating'],
                    review['sentiment'],
                    review['product_name'],
                    review['source'],
                    review['url'],
                    review['crawled_at']
                ))
            
            conn.commit()
            conn.close()
            
            print("✅ Reviews saved to database successfully")
            
        except Exception as e:
            print(f"❌ Error saving to database: {e}")
    
    def save_to_csv(self, reviews: List[Dict], filename: str = "data/crawled_reviews.csv"):
        """Lưu reviews vào CSV file với format chuẩn cho training"""
        print(f"💾 Saving {len(reviews)} reviews to {filename}...")
        
        try:
            # Chuẩn bị data với format chuẩn
            csv_data = []
            for review in reviews:
                # Map sentiment sang số
                sentiment_map = {"positive": 2, "negative": 0, "neutral": 1}
                
                csv_data.append({
                    'text': review['content'],  # Text gốc
                    'processed_text': self.clean_text(review['content']),  # Text đã xử lý
                    'sentiment': review['sentiment'],  # Sentiment text
                    'sentiment_label': sentiment_map.get(review['sentiment'], 1),  # Sentiment số
                    'rating': review['rating'],  # Rating (1-5)
                    'author': review['author'],  # Tác giả
                    'product_name': review['product_name'],  # Tên sản phẩm
                    'source': review['source'],  # Nguồn crawl
                    'url': review['url'],  # URL sản phẩm
                    'crawled_at': review['crawled_at']  # Thời gian crawl
                })
            
            df = pd.DataFrame(csv_data)
            
            # Tạo thư mục nếu chưa có
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            # Lưu CSV với encoding UTF-8
            df.to_csv(filename, index=False, encoding='utf-8')
            print(f"✅ Reviews saved to {filename}")
            
            # Hiển thị thống kê
            print(f"📊 CSV Statistics:")
            print(f"  Total rows: {len(df)}")
            print(f"  Sentiment distribution:")
            sentiment_counts = df['sentiment'].value_counts()
            for sentiment, count in sentiment_counts.items():
                print(f"    {sentiment}: {count}")
            print(f"  Source distribution:")
            source_counts = df['source'].value_counts()
            for source, count in source_counts.items():
                print(f"    {source}: {count}")
                
        except Exception as e:
            print(f"❌ Error saving to CSV: {e}")
    
    def run_crawling(self, max_pages: int = 3):
        """Chạy crawling từ tất cả các nguồn"""
        print("🚀 Starting furniture reviews crawling...")
        print("=" * 60)
        
        all_reviews = []
        
        # Crawl từ các nguồn
        try:
            noithatviet_reviews = self.crawl_noithatviet(max_pages)
            all_reviews.extend(noithatviet_reviews)
        except Exception as e:
            print(f"❌ Error crawling noithatviet.vn: {e}")
        
        try:
            shopee_reviews = self.crawl_shopee_furniture(max_pages)
            all_reviews.extend(shopee_reviews)
        except Exception as e:
            print(f"❌ Error crawling Shopee: {e}")
        
        try:
            lazada_reviews = self.crawl_lazada_furniture(max_pages)
            all_reviews.extend(lazada_reviews)
        except Exception as e:
            print(f"❌ Error crawling Lazada: {e}")
        
        # Lưu dữ liệu
        if all_reviews:
            self.save_to_database(all_reviews)
            self.save_to_csv(all_reviews)
            
            # Thống kê
            print("\n📊 Crawling Statistics:")
            print(f"Total reviews: {len(all_reviews)}")
            
            sentiment_counts = {}
            source_counts = {}
            
            for review in all_reviews:
                sentiment = review['sentiment']
                source = review['source']
                
                sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
                source_counts[source] = source_counts.get(source, 0) + 1
            
            print("\nSentiment distribution:")
            for sentiment, count in sentiment_counts.items():
                print(f"  {sentiment}: {count}")
            
            print("\nSource distribution:")
            for source, count in source_counts.items():
                print(f"  {source}: {count}")
                
        else:
            print("❌ No reviews crawled")
        
        print("\n🎉 Crawling completed!")

def main():
    """Main function"""
    crawler = FurnitureReviewCrawler()
    
    # Chạy crawling với 3 pages mỗi nguồn
    crawler.run_crawling(max_pages=3)

if __name__ == "__main__":
    main()
