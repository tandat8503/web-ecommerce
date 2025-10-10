#!/usr/bin/env python3
"""
Agent API - REST API cho hệ thống agents e-commerce
Chức năng: Expose agent functionality qua REST API
"""

import os
import sys
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent_orchestrator import AgentOrchestrator, AgentRequest, AgentResponse, RequestType, Priority

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global orchestrator instance
orchestrator = None

def init_orchestrator():
    """Initialize orchestrator"""
    global orchestrator
    if orchestrator is None:
        orchestrator = AgentOrchestrator()
        logger.info("✅ Agent Orchestrator initialized")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "agents": len(orchestrator.agent_system.get_enabled_agents()) if orchestrator else 0
    })

@app.route('/agents', methods=['GET'])
def list_agents():
    """List all available agents"""
    if not orchestrator:
        return jsonify({"error": "Orchestrator not initialized"}), 500
    
    agents = orchestrator.agent_system.get_enabled_agents()
    agent_list = []
    
    for name, config in agents.items():
        agent_list.append({
            "name": name,
            "display_name": config.name,
            "description": config.description,
            "tools": config.tools,
            "temperature": config.temperature,
            "enabled": config.enabled
        })
    
    return jsonify({
        "agents": agent_list,
        "total": len(agent_list)
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Chat with agent system"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "Message is required"}), 400
        
        user_message = data['message']
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', f"session_{datetime.now().timestamp()}")
        context = data.get('context', {})
        priority = data.get('priority', 'medium')
        
        # Convert priority string to enum
        priority_map = {
            'low': Priority.LOW,
            'medium': Priority.MEDIUM,
            'high': Priority.HIGH,
            'urgent': Priority.URGENT
        }
        priority_enum = priority_map.get(priority.lower(), Priority.MEDIUM)
        
        # Create agent request
        agent_request = AgentRequest(
            request_id=f"req_{datetime.now().timestamp()}",
            user_message=user_message,
            request_type=RequestType.GENERAL_QUESTION,  # Will be classified
            priority=priority_enum,
            context=context,
            user_id=user_id,
            session_id=session_id
        )
        
        # Process request
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(orchestrator.process_request(agent_request))
        loop.close()
        
        return jsonify({
            "request_id": response.request_id,
            "agent_name": response.agent_name,
            "response": response.response_text,
            "confidence": response.confidence,
            "actions_taken": response.actions_taken,
            "next_steps": response.next_steps,
            "metadata": response.metadata,
            "timestamp": response.timestamp.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/classify', methods=['POST'])
def classify_request():
    """Classify user request"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "Message is required"}), 400
        
        user_message = data['message']
        context = data.get('context', {})
        
        # Classify request
        request_type, confidence = orchestrator.classify_request(user_message, context)
        
        # Select agent
        agent_name, agent_confidence = orchestrator.select_agent(request_type, context)
        
        return jsonify({
            "message": user_message,
            "request_type": request_type.value,
            "request_confidence": confidence,
            "selected_agent": agent_name,
            "agent_confidence": agent_confidence,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in classify endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/performance', methods=['GET'])
def get_performance():
    """Get agent performance metrics"""
    if not orchestrator:
        return jsonify({"error": "Orchestrator not initialized"}), 500
    
    performance = orchestrator.get_agent_performance()
    history = orchestrator.get_request_history(limit=10)
    
    return jsonify({
        "agent_performance": performance,
        "recent_requests": len(history),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/history', methods=['GET'])
def get_history():
    """Get request history"""
    if not orchestrator:
        return jsonify({"error": "Orchestrator not initialized"}), 500
    
    limit = request.args.get('limit', 10, type=int)
    history = orchestrator.get_request_history(limit=limit)
    
    # Convert to JSON serializable format
    history_data = []
    for item in history:
        history_data.append({
            "request": {
                "request_id": item["request"].request_id,
                "user_message": item["request"].user_message,
                "request_type": item["request"].request_type.value,
                "priority": item["request"].priority.value,
                "user_id": item["request"].user_id,
                "session_id": item["request"].session_id,
                "timestamp": item["request"].timestamp.isoformat()
            },
            "response": {
                "agent_name": item["response"].agent_name,
                "response_text": item["response"].response_text,
                "confidence": item["response"].confidence,
                "timestamp": item["response"].timestamp.isoformat()
            },
            "timestamp": item["timestamp"].isoformat()
        })
    
    return jsonify({
        "history": history_data,
        "total": len(history_data),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/report', methods=['POST'])
def create_report():
    """Create report using report_writer agent"""
    try:
        data = request.get_json()
        
        if not data or 'title' not in data:
            return jsonify({"error": "Title is required"}), 400
        
        title = data['title']
        outline = data.get('outline', [])
        data_sources = data.get('data_sources', [])
        highlights = data.get('highlights', [])
        audience = data.get('audience', 'general')
        
        # Create context for report
        context = {
            "title": title,
            "outline": outline,
            "data_sources": data_sources,
            "highlights": highlights,
            "audience": audience
        }
        
        # Create agent request for report
        agent_request = AgentRequest(
            request_id=f"report_{datetime.now().timestamp()}",
            user_message=f"Tạo báo cáo '{title}' với outline: {', '.join(outline)}",
            request_type=RequestType.REPORT,
            priority=Priority.MEDIUM,
            context=context,
            user_id=data.get('user_id', 'system'),
            session_id=data.get('session_id', f"report_{datetime.now().timestamp()}")
        )
        
        # Process request
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(orchestrator.process_request(agent_request))
        loop.close()
        
        return jsonify({
            "request_id": response.request_id,
            "agent_name": response.agent_name,
            "response": response.response_text,
            "confidence": response.confidence,
            "actions_taken": response.actions_taken,
            "next_steps": response.next_steps,
            "metadata": response.metadata,
            "timestamp": response.timestamp.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in report endpoint: {e}")
        return jsonify({"error": str(e)}), 500

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Agent API Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5003, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    init_orchestrator()
    
    print("🚀 Starting Agent API Server")
    print("=" * 50)
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Debug: {args.debug}")
    print("\n📋 Available Endpoints:")
    print("  GET  /health - Health check")
    print("  GET  /agents - List all agents")
    print("  POST /chat - Chat with agent system")
    print("  POST /classify - Classify user request")
    print("  GET  /performance - Get performance metrics")
    print("  GET  /history - Get request history")
    print("  POST /report - Create report")
    print("\n🎯 Ready to serve requests!")
    
    # Run Flask app
    app.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == "__main__":
    main()

