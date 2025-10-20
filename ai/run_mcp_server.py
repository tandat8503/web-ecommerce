#!/usr/bin/env python3
"""
Run MCP Server for web-ecommerce AI system
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from mcps.server import WebEcommerceMCPServer
from core.logging import setup_logging

async def main():
    """Main function to run the MCP server"""
    # Setup logging
    logger = setup_logging(level="INFO")
    
    try:
        # Create and start MCP server
        server = WebEcommerceMCPServer()
        
        print("🚀 Starting Web-ecommerce MCP Server...")
        print("📡 Server will be available at: http://localhost:8001")
        print("🔧 Available tools:")
        print("   - search_products")
        print("   - analyze_sentiment")
        print("   - summarize_sentiment_by_product")
        print("   - get_revenue_analytics")
        print("   - get_sales_performance")
        print("   - get_product_metrics")
        print("   - generate_report")
        print("\nPress Ctrl+C to stop the server")
        
        await server.start(host="0.0.0.0", port=8001)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
