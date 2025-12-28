#!/usr/bin/env python3
"""
Simple script to check ChromaDB VectorDB status
Compatible with older ChromaDB versions
"""

import sys
from pathlib import Path
import sqlite3
import json

def check_vectordb_simple():
    """Check ChromaDB using direct SQLite access"""
    print("=" * 80)
    print("🔍 CHECKING CHROMADB VECTORDB STATUS (Simple Mode)")
    print("=" * 80)
    
    chroma_db_path = Path(__file__).parent / ".chroma" / "chroma.sqlite3"
    
    print(f"\n📁 ChromaDB SQLite Path: {chroma_db_path}")
    print(f"   Exists: {chroma_db_path.exists()}")
    
    if not chroma_db_path.exists():
        print("\n❌ ChromaDB database not found!")
        print("   You need to run embedding script first.")
        return
    
    # Get file size
    file_size = chroma_db_path.stat().st_size
    print(f"   Size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")
    
    try:
        # Connect to SQLite
        conn = sqlite3.connect(str(chroma_db_path))
        cursor = conn.cursor()
        
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"\n📊 Database Tables: {len(tables)}")
        for table in tables:
            print(f"   - {table[0]}")
        
        # Check collections table
        print(f"\n{'=' * 80}")
        print(f"📚 COLLECTIONS")
        print(f"{'=' * 80}")
        
        try:
            cursor.execute("SELECT id, name, topic FROM collections")
            collections = cursor.fetchall()
            
            if not collections:
                print("\n❌ No collections found!")
                print("   You need to run embedding script first.")
                conn.close()
                return
            
            print(f"\nTotal Collections: {len(collections)}")
            
            for coll_id, coll_name, coll_topic in collections:
                print(f"\n{'=' * 80}")
                print(f"📦 Collection: {coll_name}")
                print(f"   ID: {coll_id}")
                print(f"   Topic: {coll_topic}")
                print(f"{'=' * 80}")
                
                # Count embeddings in this collection
                cursor.execute("""
                    SELECT COUNT(*) FROM embeddings 
                    WHERE collection_id = ?
                """, (coll_id,))
                embedding_count = cursor.fetchone()[0]
                print(f"   Total Embeddings: {embedding_count}")
                
                if embedding_count == 0:
                    print("   ⚠️  Collection is empty!")
                    continue
                
                # Get sample embeddings
                cursor.execute("""
                    SELECT e.id, e.embedding, e.document, e.metadata
                    FROM embeddings e
                    WHERE e.collection_id = ?
                    LIMIT 5
                """, (coll_id,))
                samples = cursor.fetchall()
                
                print(f"\n   📄 Sample Documents (first 5):")
                for i, (emb_id, embedding, document, metadata) in enumerate(samples, 1):
                    print(f"\n   [{i}] ID: {emb_id}")
                    
                    # Check document
                    if document:
                        doc_preview = document[:100] + "..." if len(document) > 100 else document
                        print(f"       Document: {doc_preview}")
                    else:
                        print(f"       Document: ❌ Missing!")
                    
                    # Check metadata
                    if metadata:
                        try:
                            meta_dict = json.loads(metadata) if isinstance(metadata, str) else metadata
                            print(f"       Metadata:")
                            for key, value in (meta_dict.items() if isinstance(meta_dict, dict) else []):
                                if isinstance(value, str) and len(value) > 50:
                                    print(f"         - {key}: {value[:50]}...")
                                else:
                                    print(f"         - {key}: {value}")
                        except:
                            print(f"       Metadata: {str(metadata)[:100]}...")
                    else:
                        print(f"       Metadata: ❌ Missing!")
                    
                    # Check embedding
                    if embedding:
                        # Embedding is stored as blob, check size
                        emb_size = len(embedding) if isinstance(embedding, bytes) else 0
                        print(f"       Embedding: ✅ Present ({emb_size} bytes)")
                    else:
                        print(f"       Embedding: ❌ Missing!")
                
                # Summary for this collection
                print(f"\n   {'=' * 76}")
                if embedding_count > 0:
                    print(f"   ✅ Status: GOOD - Collection has {embedding_count} embeddings")
                    
                    # Check if all have embeddings
                    cursor.execute("""
                        SELECT COUNT(*) FROM embeddings 
                        WHERE collection_id = ? AND embedding IS NULL
                    """, (coll_id,))
                    null_count = cursor.fetchone()[0]
                    
                    if null_count > 0:
                        print(f"   ⚠️  Warning: {null_count} embeddings are NULL")
                        print(f"   🔧 Action: Need to re-embed data")
                    else:
                        print(f"   ✅ All embeddings are present")
                else:
                    print(f"   ❌ Status: BAD - Collection is empty")
                    print(f"   🔧 Action: Need to run embedding script")
        
        except sqlite3.OperationalError as e:
            print(f"\n❌ Error querying collections: {e}")
            print("   Database schema might be different.")
        
        # Overall summary
        print(f"\n{'=' * 80}")
        print(f"📊 OVERALL SUMMARY")
        print(f"{'=' * 80}")
        
        cursor.execute("SELECT COUNT(*) FROM embeddings")
        total_embeddings = cursor.fetchone()[0]
        
        print(f"Database Size: {file_size / 1024 / 1024:.2f} MB")
        print(f"Total Embeddings: {total_embeddings}")
        
        if total_embeddings > 0:
            print(f"\n✅ VectorDB has data")
            
            # Check for NULL embeddings
            cursor.execute("SELECT COUNT(*) FROM embeddings WHERE embedding IS NULL")
            null_embeddings = cursor.fetchone()[0]
            
            if null_embeddings > 0:
                print(f"\n⚠️  Warning: {null_embeddings} embeddings are NULL")
                print(f"\n🔧 RECOMMENDATION: Need to re-embed data")
                print(f"   Run: cd ai && python3 scripts/process_legal_documents.py")
            else:
                print(f"\n✅ All embeddings are present - Data is GOOD!")
                print(f"\n🎉 No need to re-embed. VectorDB is ready to use.")
        else:
            print(f"\n❌ VectorDB is empty")
            print(f"\n🔧 ACTION REQUIRED:")
            print(f"   Run: cd ai && python3 scripts/process_legal_documents.py")
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


def check_embedding_model():
    """Check if embedding model is available"""
    print(f"\n{'=' * 80}")
    print(f"🧪 CHECKING EMBEDDING MODEL")
    print(f"{'=' * 80}")
    
    try:
        from sentence_transformers import SentenceTransformer
        
        # Try to load model
        model_name = "keepitreal/vietnamese-sbert"
        print(f"\nModel: {model_name}")
        print(f"Loading model...")
        
        model = SentenceTransformer(model_name)
        print(f"✅ Model loaded successfully!")
        
        # Test embedding
        test_text = "Điều 1. Phạm vi điều chỉnh"
        print(f"\nTest Text: {test_text}")
        
        embedding = model.encode([test_text], normalize_embeddings=True)
        print(f"✅ Embedding successful!")
        print(f"   Dimension: {len(embedding[0])}")
        print(f"   Sample values: {embedding[0][:5]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"\n🔧 ACTION: Install sentence-transformers")
        print(f"   Run: pip install sentence-transformers")


if __name__ == "__main__":
    check_vectordb_simple()
    check_embedding_model()
    
    print(f"\n{'=' * 80}")
    print(f"✅ CHECK COMPLETED")
    print(f"{'=' * 80}")
