#!/usr/bin/env python3
"""
Comprehensive AI Chatbot Law (Admin) Audit
Kiểm tra toàn diện Legal Assistant cho Admin
"""

import sys
from pathlib import Path
import asyncio
import json
import sqlite3

sys.path.insert(0, str(Path(__file__).parent))


async def check_legal_vectordb():
    """Check legal documents VectorDB"""
    print("=" * 80)
    print("📚 LEGAL DOCUMENTS VECTORDB CHECK")
    print("=" * 80)
    
    issues = []
    
    # Check VectorDB
    chroma_db = Path(__file__).parent / ".chroma" / "chroma.sqlite3"
    
    if not chroma_db.exists():
        print("\n❌ VectorDB not found!")
        issues.append(("No VectorDB", "CRITICAL", "Run process_legal_documents.py"))
        return issues
    
    # Connect to SQLite
    conn = sqlite3.connect(str(chroma_db))
    cursor = conn.cursor()
    
    # Get legal_documents collection
    cursor.execute("""
        SELECT COUNT(e.id)
        FROM embeddings e
        JOIN segments s ON e.segment_id = s.id
        JOIN collections c ON s.collection = c.id
        WHERE c.name = 'legal_documents'
    """)
    legal_count = cursor.fetchone()[0]
    
    print(f"\n📊 Legal Documents in VectorDB: {legal_count}")
    
    if legal_count == 0:
        print(f"   ❌ No legal documents embedded!")
        issues.append(("Empty Legal VectorDB", "CRITICAL", "Run process_legal_documents.py"))
    elif legal_count < 100:
        print(f"   ⚠️  Only {legal_count} documents (seems low)")
        issues.append(("Few Legal Documents", "MEDIUM", "Check if all laws are processed"))
    else:
        print(f"   ✅ Good amount of legal documents")
    
    # Get sample documents
    cursor.execute("""
        SELECT e.document
        FROM embeddings e
        JOIN segments s ON e.segment_id = s.id
        JOIN collections c ON s.collection = c.id
        WHERE c.name = 'legal_documents'
        LIMIT 3
    """)
    samples = cursor.fetchall()
    
    print(f"\n📄 Sample Legal Documents:")
    for i, (doc,) in enumerate(samples, 1):
        doc_preview = doc[:100] + "..." if doc and len(doc) > 100 else doc
        print(f"   [{i}] {doc_preview}")
    
    conn.close()
    
    return issues


async def check_legal_service():
    """Check Legal Service implementation"""
    print("\n" + "=" * 80)
    print("🔍 LEGAL SERVICE IMPLEMENTATION CHECK")
    print("=" * 80)
    
    issues = []
    
    # Check if legal_service.py exists
    legal_service_file = Path(__file__).parent / "services" / "legal" / "legal_service.py"
    
    if not legal_service_file.exists():
        print("\n❌ legal_service.py not found!")
        issues.append(("No Legal Service", "CRITICAL", "Create legal_service.py"))
        return issues
    
    content = legal_service_file.read_text()
    
    # 1. Check RAG implementation
    print("\n1️⃣  RAG (Retrieval-Augmented Generation)")
    if "vector_service" in content and "search" in content:
        print(f"   ✅ RAG implementation present")
    else:
        print(f"   ❌ No RAG implementation")
        issues.append(("No RAG", "CRITICAL", "Implement RAG for legal queries"))
    
    # 2. Check Tax Calculator
    print("\n2️⃣  Tax Calculator")
    if "tax_calculator" in content.lower() or "calculate_tax" in content:
        print(f"   ✅ Tax calculator present")
    else:
        print(f"   ⚠️  No tax calculator")
        issues.append(("No Tax Calculator", "MEDIUM", "Add tax calculation feature"))
    
    # 3. Check Intent Classification
    print("\n3️⃣  Intent Classification")
    if "classify_intent" in content or "_classify_intent" in content:
        print(f"   ✅ Intent classification present")
    else:
        print(f"   ⚠️  No intent classification")
        issues.append(("No Intent Classification", "MEDIUM", "Add intent detection"))
    
    # 4. Check Error Handling
    print("\n4️⃣  Error Handling")
    try_count = content.count("try:")
    except_count = content.count("except")
    
    if try_count > 0 and except_count > 0:
        print(f"   ✅ Error handling present ({try_count} try blocks)")
    else:
        print(f"   ⚠️  Limited error handling")
        issues.append(("Limited Error Handling", "MEDIUM", "Add comprehensive error handling"))
    
    # 5. Check Response Format
    print("\n5️⃣  Response Format")
    if "markdown" in content.lower() or "format" in content:
        print(f"   ✅ Response formatting present")
    else:
        print(f"   ⚠️  No response formatting")
        issues.append(("No Response Formatting", "LOW", "Add Markdown formatting"))
    
    # 6. Check Citation/Source
    print("\n6️⃣  Citation/Source Tracking")
    if "citation" in content.lower() or "source" in content.lower() or "doc_name" in content:
        print(f"   ✅ Citation tracking present")
    else:
        print(f"   ⚠️  No citation tracking")
        issues.append(("No Citations", "MEDIUM", "Add source citations"))
    
    return issues


async def check_legal_prompts():
    """Check legal prompts quality"""
    print("\n" + "=" * 80)
    print("📝 LEGAL PROMPTS CHECK")
    print("=" * 80)
    
    issues = []
    
    prompts_file = Path(__file__).parent / "prompts.py"
    
    if not prompts_file.exists():
        print("\n❌ prompts.py not found!")
        return issues
    
    content = prompts_file.read_text()
    
    # Check for legal-specific prompts
    print("\n1️⃣  Legal Consultant Prompt")
    if "LEGAL_CONSULTANT" in content or "legal" in content.lower():
        print(f"   ✅ Legal prompts present")
        
        # Check prompt quality
        if "luật" in content.lower() and "điều" in content.lower():
            print(f"   ✅ Vietnamese legal terminology present")
        else:
            print(f"   ⚠️  Missing Vietnamese legal terminology")
            issues.append(("Weak Legal Prompts", "MEDIUM", "Add Vietnamese legal terms"))
    else:
        print(f"   ❌ No legal prompts found")
        issues.append(("No Legal Prompts", "HIGH", "Create legal consultant prompts"))
    
    # Check for hallucination prevention
    print("\n2️⃣  Hallucination Prevention")
    if "chỉ sử dụng" in content.lower() or "only use" in content.lower():
        print(f"   ✅ Hallucination prevention instructions present")
    else:
        print(f"   ⚠️  No hallucination prevention")
        issues.append(("No Hallucination Prevention", "HIGH", "Add strict data-only instructions"))
    
    return issues


async def check_legal_data_quality():
    """Check legal documents data quality"""
    print("\n" + "=" * 80)
    print("📊 LEGAL DATA QUALITY CHECK")
    print("=" * 80)
    
    issues = []
    
    # Check luat_VN directory
    luat_dir = Path(__file__).parent / "luat_VN"
    
    if not luat_dir.exists():
        print("\n❌ luat_VN directory not found!")
        issues.append(("No Legal Documents", "CRITICAL", "Add legal documents to luat_VN/"))
        return issues
    
    # Count files
    txt_files = list(luat_dir.glob("*.txt"))
    pdf_files = list(luat_dir.glob("*.pdf"))
    doc_files = list(luat_dir.glob("*.doc*"))
    
    total_files = len(txt_files) + len(pdf_files) + len(doc_files)
    
    print(f"\n📁 Legal Documents Directory:")
    print(f"   Total files: {total_files}")
    print(f"   - TXT files: {len(txt_files)}")
    print(f"   - PDF files: {len(pdf_files)}")
    print(f"   - DOC files: {len(doc_files)}")
    
    if total_files == 0:
        print(f"\n   ❌ No legal documents found!")
        issues.append(("No Legal Files", "CRITICAL", "Add legal documents"))
    elif total_files < 5:
        print(f"\n   ⚠️  Only {total_files} files (seems low)")
        issues.append(("Few Legal Files", "MEDIUM", "Add more legal documents"))
    else:
        print(f"\n   ✅ Good amount of legal documents")
    
    # Show sample files
    if txt_files:
        print(f"\n📄 Sample TXT files:")
        for f in txt_files[:3]:
            print(f"   - {f.name}")
    
    return issues


async def check_admin_integration():
    """Check if Legal AI is integrated with admin panel"""
    print("\n" + "=" * 80)
    print("🔗 ADMIN INTEGRATION CHECK")
    print("=" * 80)
    
    issues = []
    
    # Check app.py for legal endpoint
    app_file = Path(__file__).parent / "app.py"
    
    if app_file.exists():
        content = app_file.read_text()
        
        print("\n1️⃣  Legal Endpoint")
        if "/legal" in content or "legal" in content.lower():
            print(f"   ✅ Legal endpoint present")
        else:
            print(f"   ❌ No legal endpoint")
            issues.append(("No Legal Endpoint", "HIGH", "Add /legal endpoint in app.py"))
        
        print("\n2️⃣  Admin Type Routing")
        if "admin" in content and "user_type" in content:
            print(f"   ✅ Admin routing present")
        else:
            print(f"   ⚠️  No admin routing")
            issues.append(("No Admin Routing", "MEDIUM", "Add admin type routing"))
    
    return issues


async def test_legal_service():
    """Test legal service with sample query"""
    print("\n" + "=" * 80)
    print("🧪 LEGAL SERVICE FUNCTIONALITY TEST")
    print("=" * 80)
    
    issues = []
    
    try:
        from services.legal.legal_service import LegalAssistant
        
        print("\n✅ LegalAssistant imported successfully")
        
        # Try to initialize
        try:
            assistant = LegalAssistant()
            print("✅ LegalAssistant initialized successfully")
            
            # Test with sample query
            print("\n📝 Testing with sample query...")
            test_query = "Điều kiện thành lập công ty là gì?"
            
            print(f"   Query: {test_query}")
            
            try:
                result = await assistant.process_query(test_query)
                
                if result:
                    print(f"   ✅ Query processed successfully")
                    print(f"   Response length: {len(result)} chars")
                    print(f"   Preview: {result[:200]}...")
                else:
                    print(f"   ⚠️  Empty response")
                    issues.append(("Empty Response", "MEDIUM", "Check legal data"))
            except Exception as e:
                print(f"   ❌ Error processing query: {e}")
                issues.append(("Query Processing Error", "HIGH", str(e)))
        
        except Exception as e:
            print(f"❌ Error initializing LegalAssistant: {e}")
            issues.append(("Initialization Error", "HIGH", str(e)))
    
    except ImportError as e:
        print(f"❌ Cannot import LegalAssistant: {e}")
        issues.append(("Import Error", "CRITICAL", "Fix import issues"))
    
    return issues


async def main():
    """Main audit function"""
    print("\n" + "=" * 80)
    print("🔍 AI CHATBOT LAW (ADMIN) COMPREHENSIVE AUDIT")
    print("=" * 80)
    print("\nScanning Legal Assistant for Admin...\n")
    
    all_issues = []
    
    # Run all checks
    vectordb_issues = await check_legal_vectordb()
    all_issues.extend(vectordb_issues)
    
    service_issues = await check_legal_service()
    all_issues.extend(service_issues)
    
    prompts_issues = await check_legal_prompts()
    all_issues.extend(prompts_issues)
    
    data_issues = await check_legal_data_quality()
    all_issues.extend(data_issues)
    
    integration_issues = await check_admin_integration()
    all_issues.extend(integration_issues)
    
    test_issues = await test_legal_service()
    all_issues.extend(test_issues)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 AUDIT SUMMARY")
    print("=" * 80)
    
    critical = [i for i in all_issues if i[1] == "CRITICAL"]
    high = [i for i in all_issues if i[1] == "HIGH"]
    medium = [i for i in all_issues if i[1] == "MEDIUM"]
    low = [i for i in all_issues if i[1] == "LOW"]
    
    print(f"\n🔴 CRITICAL Issues: {len(critical)}")
    for issue, severity, fix in critical:
        print(f"   - {issue}: {fix}")
    
    print(f"\n🟠 HIGH Issues: {len(high)}")
    for issue, severity, fix in high:
        print(f"   - {issue}: {fix}")
    
    print(f"\n🟡 MEDIUM Issues: {len(medium)}")
    for issue, severity, fix in medium[:5]:
        print(f"   - {issue}: {fix}")
    if len(medium) > 5:
        print(f"   ... and {len(medium) - 5} more")
    
    print(f"\n🟢 LOW Issues: {len(low)}")
    for issue, severity, fix in low:
        print(f"   - {issue}: {fix}")
    
    # Overall score
    total_issues = len(all_issues)
    critical_weight = len(critical) * 10
    high_weight = len(high) * 5
    medium_weight = len(medium) * 2
    low_weight = len(low) * 1
    
    total_weight = critical_weight + high_weight + medium_weight + low_weight
    max_weight = 100
    
    score = max(0, 100 - total_weight)
    
    print(f"\n{'=' * 80}")
    print(f"🎯 OVERALL LEGAL AI SCORE: {score}/100")
    print(f"{'=' * 80}")
    
    if score >= 80:
        print(f"\n✅ EXCELLENT - Legal AI is production-ready")
    elif score >= 60:
        print(f"\n⚠️  GOOD - Some improvements needed")
    elif score >= 40:
        print(f"\n⚠️  FAIR - Several issues to fix")
    else:
        print(f"\n❌ POOR - Critical issues must be fixed")
    
    print(f"\n📝 Total Issues Found: {total_issues}")
    print(f"   - CRITICAL: {len(critical)}")
    print(f"   - HIGH: {len(high)}")
    print(f"   - MEDIUM: {len(medium)}")
    print(f"   - LOW: {len(low)}")
    
    print("\n" + "=" * 80)
    print("✅ AUDIT COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
