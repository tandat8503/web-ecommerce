#!/usr/bin/env python3
"""
AI System Main Server
Production-ready server for AI services
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add current directory to Python path
sys.path.append(str(Path(__file__).parent))

def setup_logging(debug=False):
    """Setup logging configuration"""
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    # Configure logging
    log_level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/ai_server.log'),
            logging.StreamHandler()
        ]
    )
    
    return logging.getLogger(__name__)

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='AI System Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5002, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--workers', type=int, default=1, help='Number of workers')
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging(args.debug)
    
    # Import and start server
    try:
        from api.server import app
        
        logger.info("🚀 Starting AI System Server")
        logger.info(f"📍 Host: {args.host}")
        logger.info(f"🔌 Port: {args.port}")
        logger.info(f"🐛 Debug: {args.debug}")
        logger.info(f"👥 Workers: {args.workers}")
        
        # Start server
        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug,
            threaded=True
        )
        
    except ImportError as e:
        logger.error(f"❌ Failed to import server: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
