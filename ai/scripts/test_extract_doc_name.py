"""
Script test để kiểm tra extract_doc_name
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.legal.parser import LegalDocumentParser

def test_extract_doc_name():
    parser = LegalDocumentParser()
    
    test_cases = [
        # Case 1: Tên luật trên một dòng
        ("LUẬT DOANH NGHIỆP 2020\nQuốc hội...", "Luật Doanh Nghiệp 2020"),
        
        # Case 2: Tên luật trên nhiều dòng
        ("LUẬT\nDOANH NGHIỆP\n2020\nQuốc hội...", "Luật Doanh Nghiệp 2020"),
        
        # Case 3: Tên luật với chữ thường
        ("Luật\nĐầu tư\n2020\nSố hiệu...", "Luật Đầu Tư 2020"),
        
        # Case 4: Tên luật có dấu
        ("LUẬT\nTHUẾ\nGIÁ TRỊ GIA TĂNG\n2008", "Luật Thuế Giá Trị Gia Tăng 2008"),
        
        # Case 5: Tên luật có "về", "của"
        ("LUẬT\nVỀ\nDOANH NGHIỆP\n2020", "Luật Về Doanh Nghiệp 2020"),
    ]
    
    print("=" * 80)
    print("TEST EXTRACT DOC NAME")
    print("=" * 80)
    
    for i, (input_text, expected) in enumerate(test_cases, 1):
        result = parser.extract_doc_name(input_text)
        status = "✅" if result == expected else "❌"
        print(f"\nTest {i}: {status}")
        print(f"  Input: {repr(input_text[:50])}...")
        print(f"  Expected: {expected}")
        print(f"  Got:      {result}")
        if result != expected:
            print(f"  ⚠️  MISMATCH!")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    test_extract_doc_name()




