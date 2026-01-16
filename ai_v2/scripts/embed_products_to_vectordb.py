#!/usr/bin/env python3
"""
Embed products into VectorDB for semantic search
"""
import asyncio
import json
import sys
from pathlib import Path
from sentence_transformers import SentenceTransformer
import chromadb

sys.path.insert(0, str(Path(__file__).parent.parent))


def create_rich_text_for_product(product: dict) -> str:
    """Create rich text for embedding"""
    
    # Basic info
    text = f"{product['name']} - {product['brand']}\n\n"
    text += f"Danh mục: {product['category']}\n"
    text += f"Giá: {product['final_price']:,.0f}đ"
    
    if product.get('sale_price'):
        text += f" (Giảm giá từ {product['price']:,.0f}đ)"
    
    text += "\n\n"
    
    # Description
    if product.get('description'):
        text += f"Mô tả:\n{product['description']}\n\n"
    
    # Specs from first variant
    if product.get('variants') and len(product['variants']) > 0:
        variant = product['variants'][0]
        text += "Thông số kỹ thuật:\n"
        
        dims = variant.get('dimensions', {})
        if dims.get('width') and dims.get('depth') and dims.get('height'):
            text += f"- Kích thước: {dims['width']}x{dims['depth']}x{dims['height']}cm"
            
            # Infer suitable space
            width = dims['width']
            if width < 120:
                text += " (Nhỏ gọn, phù hợp văn phòng nhỏ)\n"
            elif width < 160:
                text += " (Vừa phải, phù hợp văn phòng trung bình)\n"
            else:
                text += " (Rộng rãi, phù hợp văn phòng lớn)\n"
        
        if variant.get('material'):
            text += f"- Chất liệu: {variant['material']}\n"
        
        if variant.get('color'):
            text += f"- Màu sắc: {variant['color']}\n"
        
        if variant.get('weight_capacity'):
            text += f"- Tải trọng: {variant['weight_capacity']}kg\n"
        
        if variant.get('warranty'):
            text += f"- Bảo hành: {variant['warranty']}\n"
    
    # Infer use cases based on category and price
    text += "\nPhù hợp:\n"
    
    category = product['category'].lower()
    price = product['final_price']
    
    if 'bàn' in category:
        if price < 3000000:
            text += "- Học sinh, sinh viên\n- Làm việc tại nhà (WFH)\n- Văn phòng nhỏ\n"
        elif price < 7000000:
            text += "- Nhân viên văn phòng\n- Freelancer\n- Văn phòng vừa và nhỏ\n"
        else:
            text += "- Giám đốc, quản lý\n- Văn phòng cao cấp\n- Phòng làm việc riêng\n"
    
    elif 'ghế' in category:
        if 'gaming' in category:
            text += "- Game thủ\n- Streamer\n- Làm việc nhiều giờ\n"
        elif 'công thái học' in category or 'ergonomic' in category:
            text += "- Lập trình viên\n- Nhân viên văn phòng\n- Ngồi 8+ giờ/ngày\n"
        elif price < 2000000:
            text += "- Học sinh, sinh viên\n- Văn phòng tiết kiệm\n"
        else:
            text += "- Nhân viên văn phòng\n- Phòng họp\n- Sử dụng lâu dài\n"
    
    # Rating if available
    if product.get('rating') and product['rating'] > 0:
        text += f"\nĐánh giá: {product['rating']}/5"
        if product.get('review_count'):
            text += f" ({product['review_count']} đánh giá)"
    
    return text.strip()


def embed_products():
    """Embed products into VectorDB"""
    print("="*80)
    print("🔄 EMBEDDING PRODUCTS TO VECTORDB")
    print("="*80)
    
    # 1. Load products
    json_file = Path(__file__).parent / "products_for_embedding.json"
    
    if not json_file.exists():
        print(f"\n❌ Error: {json_file} not found!")
        print("Run: python scripts/export_products_for_embedding.py first")
        return
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    products = data['products']
    print(f"\n📊 Loaded {len(products)} products")
    
    # 2. Initialize ChromaDB
    print(f"\n🔧 Initializing ChromaDB...")
    
    chroma_path = Path(__file__).parent.parent / "chroma_db"
    chroma_path.mkdir(exist_ok=True)
    
    client = chromadb.PersistentClient(path=str(chroma_path))
    
    # Delete old collection if exists
    try:
        client.delete_collection("product_catalog")
        print(f"  ✅ Deleted old product_catalog collection")
    except:
        pass
    
    collection = client.create_collection(
        name="product_catalog",
        metadata={"description": "Product catalog for semantic search"}
    )
    
    print(f"  ✅ Created new product_catalog collection")
    
    # 3. Load embedding model
    print(f"\n🤖 Loading embedding model...")
    model = SentenceTransformer("intfloat/multilingual-e5-small")
    print(f"  ✅ Model loaded")
    
    # 4. Create embeddings
    print(f"\n📝 Creating rich text and embeddings...")
    
    documents = []
    metadatas = []
    ids = []
    
    for i, product in enumerate(products):
        # Create rich text
        rich_text = create_rich_text_for_product(product)
        
        documents.append(rich_text)
        metadatas.append({
            "product_id": product['id'],
            "name": product['name'],
            "category": product['category'],
            "brand": product['brand'],
            "price": float(product['final_price']),
            "slug": product['slug']
        })
        ids.append(f"product_{product['id']}")
        
        if (i + 1) % 20 == 0:
            print(f"  ✅ Processed {i + 1}/{len(products)} products...")
    
    print(f"  ✅ Created {len(documents)} rich texts")
    
    # 5. Generate embeddings
    print(f"\n🔢 Generating embeddings...")
    embeddings = model.encode(documents, show_progress_bar=True)
    print(f"  ✅ Generated {len(embeddings)} embeddings")
    
    # 6. Add to ChromaDB
    print(f"\n💾 Adding to ChromaDB...")
    
    # Add in batches
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        end_idx = min(i + batch_size, len(documents))
        
        collection.add(
            embeddings=embeddings[i:end_idx].tolist(),
            documents=documents[i:end_idx],
            metadatas=metadatas[i:end_idx],
            ids=ids[i:end_idx]
        )
        
        print(f"  ✅ Added batch {i//batch_size + 1}/{(len(documents)-1)//batch_size + 1}")
    
    # 7. Verify
    print(f"\n🔍 Verifying...")
    count = collection.count()
    print(f"  ✅ Total documents in collection: {count}")
    
    # Test search
    test_query = "bàn làm việc cho văn phòng nhỏ"
    test_embedding = model.encode([test_query])
    
    results = collection.query(
        query_embeddings=test_embedding.tolist(),
        n_results=3
    )
    
    print(f"\n🧪 Test search: '{test_query}'")
    print(f"  Top 3 results:")
    for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
        print(f"\n  {i+1}. {metadata['name']}")
        print(f"     Category: {metadata['category']}")
        print(f"     Price: {metadata['price']:,.0f}đ")
        print(f"     Distance: {results['distances'][0][i]:.4f}")
    
    print(f"\n" + "="*80)
    print(f"✅ EMBEDDING COMPLETE!")
    print(f"="*80)
    print(f"\n📊 Summary:")
    print(f"  - Total products embedded: {count}")
    print(f"  - Collection: product_catalog")
    print(f"  - Location: {chroma_path}/product_catalog")
    print(f"\n🎯 Next: Create ProductVectorService")


def main():
    embed_products()


if __name__ == "__main__":
    main()
