#!/usr/bin/env python3
"""
Script to check ChromaDB VectorDB status
Kiểm tra xem data đã được embed chưa và có cần embed lại không
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import chromadb
from chromadb.config import Settings


def check_vectordb_status():
    """Check ChromaDB status and data quality"""
    print("=" * 80)
    print("🔍 CHECKING CHROMADB VECTORDB STATUS")
    print("=" * 80)
    
    try:
        # Initialize ChromaDB client
        chroma_path = Path(__file__).parent / ".chroma"
        print(f"\n📁 ChromaDB Path: {chroma_path}")
        print(f"   Exists: {chroma_path.exists()}")
        
        if not chroma_path.exists():
            print("\n❌ ChromaDB directory not found!")
            print("   You need to run embedding script first.")
            return
        
        # Connect to ChromaDB
        client = chromadb.PersistentClient(
            path=str(chroma_path),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=False
            )
        )
        
        print(f"\n✅ Connected to ChromaDB")
        
        # List all collections
        collections = client.list_collections()
        print(f"\n📚 Collections: {len(collections)}")
        
        if not collections:
            print("\n❌ No collections found!")
            print("   You need to run embedding script first.")
            return
        
        for collection in collections:
            print(f"\n{'=' * 80}")
            print(f"📦 Collection: {collection.name}")
            print(f"{'=' * 80}")
            
            # Get collection stats
            count = collection.count()
            print(f"   Total Documents: {count}")
            
            if count == 0:
                print("   ⚠️  Collection is empty!")
                continue
            
            # Get sample documents (first 5)
            print(f"\n   📄 Sample Documents (first 5):")
            try:
                results = collection.get(
                    limit=5,
                    include=["metadatas", "documents", "embeddings"]
                )
                
                for i, (doc_id, metadata, document, embedding) in enumerate(zip(
                    results["ids"],
                    results["metadatas"],
                    results["documents"],
                    results["embeddings"]
                ), 1):
                    print(f"\n   [{i}] ID: {doc_id}")
                    print(f"       Document: {document[:100]}..." if len(document) > 100 else f"       Document: {document}")
                    
                    # Check metadata
                    if metadata:
                        print(f"       Metadata:")
                        for key, value in metadata.items():
                            if isinstance(value, str) and len(value) > 50:
                                print(f"         - {key}: {value[:50]}...")
                            else:
                                print(f"         - {key}: {value}")
                    
                    # Check embedding
                    if embedding:
                        print(f"       Embedding: ✅ Present (dim={len(embedding)})")
                    else:
                        print(f"       Embedding: ❌ Missing!")
                
                # Check if embeddings are present
                has_embeddings = all(emb is not None for emb in results["embeddings"])
                
                print(f"\n   {'=' * 76}")
                if has_embeddings:
                    print(f"   ✅ Status: GOOD - All documents have embeddings")
                    print(f"   📊 Embedding Dimension: {len(results['embeddings'][0])}")
                else:
                    print(f"   ❌ Status: BAD - Some documents missing embeddings")
                    print(f"   🔧 Action: Need to re-embed data")
                
                # Check metadata quality
                print(f"\n   📋 Metadata Quality Check:")
                required_fields = ["doc_name", "doc_type", "article"]
                
                for field in required_fields:
                    has_field = all(field in meta for meta in results["metadatas"] if meta)
                    if has_field:
                        print(f"      ✅ {field}: Present in all documents")
                    else:
                        print(f"      ⚠️  {field}: Missing in some documents")
                
            except Exception as e:
                print(f"   ❌ Error getting sample documents: {e}")
        
        # Summary
        print(f"\n{'=' * 80}")
        print(f"📊 SUMMARY")
        print(f"{'=' * 80}")
        print(f"Total Collections: {len(collections)}")
        
        total_docs = sum(c.count() for c in collections)
        print(f"Total Documents: {total_docs}")
        
        if total_docs > 0:
            print(f"\n✅ VectorDB has data")
            print(f"\n🔍 Recommendation:")
            print(f"   1. Check sample documents above")
            print(f"   2. If embeddings are present → Data is GOOD")
            print(f"   3. If embeddings are missing → Need to re-embed")
            print(f"   4. If metadata is incomplete → Need to re-process")
        else:
            print(f"\n❌ VectorDB is empty")
            print(f"\n🔧 Action Required:")
            print(f"   Run: python scripts/process_legal_documents.py")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


def check_embedding_function():
    """Check if embedding function is working"""
    print(f"\n{'=' * 80}")
    print(f"🧪 TESTING EMBEDDING FUNCTION")
    print(f"{'=' * 80}")
    
    try:
        from services.legal.vector_service import LegalVectorService
        
        service = LegalVectorService()
        
        # Test embedding
        test_text = "Điều 1. Phạm vi điều chỉnh"
        print(f"\nTest Text: {test_text}")
        
        # This will use the embedding function
        print(f"Embedding Function: {service.embedding_function}")
        
        # Try to embed
        try:
            # Get embedding directly
            embedding = service.embedding_function([test_text])
            if embedding and len(embedding) > 0:
                print(f"✅ Embedding successful!")
                print(f"   Dimension: {len(embedding[0])}")
                print(f"   Sample values: {embedding[0][:5]}...")
            else:
                print(f"❌ Embedding failed - empty result")
        except Exception as e:
            print(f"❌ Embedding failed: {e}")
        
    except Exception as e:
        print(f"❌ Error testing embedding function: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    check_vectordb_status()
    check_embedding_function()
    
    print(f"\n{'=' * 80}")
    print(f"✅ CHECK COMPLETED")
    print(f"{'=' * 80}")
