#!/usr/bin/env python3
"""
Quick test for Gemini API key
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

print("="*60)
print("🔑 TESTING GEMINI API KEY")
print("="*60)

# Test 1: Load config
print("\n1. Loading config...")
try:
    from core.config import get_llm_config
    config = get_llm_config()
    
    if config.gemini_api_key:
        key_preview = config.gemini_api_key[:10] + "..." + config.gemini_api_key[-5:]
        print(f"✅ API key found: {key_preview}")
        print(f"   Length: {len(config.gemini_api_key)} characters")
        print(f"   Model: {config.gemini_model}")
        
        # Check length
        if len(config.gemini_api_key) < 35:
            print(f"⚠️  WARNING: Key seems too short (should be ~39-45 chars)")
        else:
            print(f"✅ Key length looks good")
    else:
        print("❌ FAILED: No API key found in config")
        print("   Check .env file for GEMINI_API_KEY")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ FAILED: Error loading config")
    print(f"   Error: {e}")
    sys.exit(1)

# Test 2: Create client
print("\n2. Creating LLM client...")
try:
    from shared.llm_client import LLMClientFactory
    
    client = LLMClientFactory.create_client()
    
    if client is None:
        print("❌ FAILED: Client is None")
        print("   LLMClientFactory.create_client() returned None")
        sys.exit(1)
    
    print(f"✅ Client created successfully")
    print(f"   Type: {type(client).__name__}")
    print(f"   Model: {client.model_name}")
    
except Exception as e:
    print(f"❌ FAILED: Error creating client")
    print(f"   Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Simple API call (synchronous)
print("\n3. Testing API call...")
try:
    import google.generativeai as genai
    
    genai.configure(api_key=config.gemini_api_key)
    model = genai.GenerativeModel(config.gemini_model or "gemini-2.0-flash-exp")
    
    response = model.generate_content("Say 'Hello' in Vietnamese")
    
    if response and response.text:
        print(f"✅ API call successful!")
        print(f"   Response: {response.text[:100]}")
    else:
        print(f"❌ FAILED: No response from API")
        
except Exception as e:
    print(f"❌ FAILED: API call error")
    print(f"   Error: {e}")
    
    if "API_KEY_INVALID" in str(e) or "invalid" in str(e).lower():
        print("\n💡 SOLUTION:")
        print("   1. Go to: https://aistudio.google.com/app/apikey")
        print("   2. Create new API key")
        print("   3. Copy FULL key (should be ~39-45 characters)")
        print("   4. Update GEMINI_API_KEY in .env file")
    
    sys.exit(1)

print("\n" + "="*60)
print("🎉 ALL TESTS PASSED!")
print("   Your Gemini API key is valid and working!")
print("="*60)
