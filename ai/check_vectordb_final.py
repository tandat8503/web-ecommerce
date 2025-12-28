#!/usr/bin/env python3
"""
Final VectorDB check script with correct schema
"""

import sys
from pathlib import Path
import sqlite3
import json

def check_vectordb_final():
    """Check ChromaDB with correct schema"""
    print("=" * 80)
    print("🔍 VECTORDB STATUS CHECK - FINAL VERSION")
    print("=" * 80)
    
    chroma_db_path = Path(__file__).parent / ".chroma" / "chroma.sqlite3"
    
    print(f"\n📁 Database: {chroma_db_path}")
    print(f"   Exists: {chroma_db_path.exists()}")
    
    if not chroma_db_path.exists():
        print("\n❌ Database not found!")
        return
    
    file_size = chroma_db_path.stat().st_size
    print(f"   Size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")
    
    try:
        conn = sqlite3.connect(str(chroma_db_path))
        cursor = conn.cursor()
        
        # Get schema for embeddings table
        print(f"\n📋 Embeddings Table Schema:")
        cursor.execute("PRAGMA table_info(embeddings)")
        columns = cursor.fetchall()
        for col in columns:
            print(f"   - {col[1]} ({col[2]})")
        
        # Check collections
        print(f"\n{'=' * 80}")
        print(f"📚 COLLECTIONS")
        print(f"{'=' * 80}")
        
        cursor.execute("SELECT id, name FROM collections")
        collections = cursor.fetchall()
        
        if not collections:
            print("\n❌ No collections found!")
            conn.close()
            return
        
        print(f"\nTotal Collections: {len(collections)}")
        
        total_embeddings = 0
        
        for coll_id, coll_name in collections:
            print(f"\n{'=' * 80}")
            print(f"📦 Collection: {coll_name}")
            print(f"   ID: {coll_id}")
            
            # Count embeddings
            cursor.execute("""
                SELECT COUNT(*) FROM embeddings 
                WHERE collection_id = ?
            """, (coll_id,))
            count = cursor.fetchone()[0]
            total_embeddings += count
            print(f"   Documents: {count}")
            
            if count == 0:
                print("   ⚠️  Empty collection!")
                continue
            
            # Get sample documents
            cursor.execute("""
                SELECT id, document 
                FROM embeddings 
                WHERE collection_id = ?
                LIMIT 3
            """, (coll_id,))
            samples = cursor.fetchall()
            
            print(f"\n   📄 Sample Documents:")
            for i, (doc_id, document) in enumerate(samples, 1):
                doc_preview = document[:80] + "..." if document and len(document) > 80 else document
                print(f"   [{i}] {doc_preview}")
            
            # Check metadata
            cursor.execute("""
                SELECT em.key, em.string_value, em.int_value 
                FROM embedding_metadata em
                JOIN embeddings e ON em.id = e.id
                WHERE e.collection_id = ?
                LIMIT 10
            """, (coll_id,))
            metadata_samples = cursor.fetchall()
            
            if metadata_samples:
                print(f"\n   📋 Sample Metadata:")
                metadata_dict = {}
                for key, str_val, int_val in metadata_samples:
                    value = str_val if str_val is not None else int_val
                    if key not in metadata_dict:
                        metadata_dict[key] = value
                
                for key, value in list(metadata_dict.items())[:5]:
                    if isinstance(value, str) and len(value) > 50:
                        print(f"      - {key}: {value[:50]}...")
                    else:
                        print(f"      - {key}: {value}")
            
            print(f"\n   ✅ Status: GOOD - {count} documents with embeddings")
        
        # Overall summary
        print(f"\n{'=' * 80}")
        print(f"📊 FINAL SUMMARY")
        print(f"{'=' * 80}")
        
        print(f"\n✅ Database Size: {file_size / 1024 / 1024:.2f} MB")
        print(f"✅ Total Collections: {len(collections)}")
        print(f"✅ Total Documents: {total_embeddings}")
        
        if total_embeddings > 0:
            print(f"\n🎉 VECTORDB IS READY!")
            print(f"\n✅ Data is embedded and ready to use")
            print(f"✅ No need to re-embed")
            
            print(f"\n📝 Collections:")
            for coll_id, coll_name in collections:
                cursor.execute("SELECT COUNT(*) FROM embeddings WHERE collection_id = ?", (coll_id,))
                count = cursor.fetchone()[0]
                print(f"   - {coll_name}: {count} documents")
        else:
            print(f"\n❌ VECTORDB IS EMPTY")
            print(f"\n🔧 ACTION REQUIRED:")
            print(f"   Run: cd ai && python3 scripts/process_legal_documents.py")
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    check_vectordb_final()
    
    print(f"\n{'=' * 80}")
    print(f"✅ CHECK COMPLETED")
    print(f"{'=' * 80}")
