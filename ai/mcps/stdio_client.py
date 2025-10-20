#!/usr/bin/env python3
"""
MCP STDIO Client for web-ecommerce AI system
"""

import asyncio
import json
import logging
import subprocess
import sys
from typing import Dict, Any, Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)


class MCPStdioClient:
    """MCP client that communicates via STDIO"""
    
    def __init__(self, server_script: str = "mcp_server.py"):
        self.server_script = server_script
        self.process: Optional[subprocess.Popen] = None
        self.request_id = 0
        self.initialized = False
    
    async def start(self):
        """Start the MCP server process"""
        try:
            # Start MCP server process
            self.process = subprocess.Popen(
                [sys.executable, self.server_script],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=Path(__file__).parent.parent
            )
            
            # Initialize the connection
            await self._initialize()
            
            logger.info("MCP STDIO client started successfully")
            
        except Exception as e:
            logger.error(f"Error starting MCP client: {e}")
            raise
    
    async def stop(self):
        """Stop the MCP server process"""
        if self.process:
            self.process.terminate()
            self.process.wait()
            self.process = None
            self.initialized = False
            logger.info("MCP STDIO client stopped")
    
    async def _initialize(self):
        """Initialize the MCP connection"""
        init_request = {
            "jsonrpc": "2.0",
            "id": self._get_next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "web-ecommerce-ai",
                    "version": "1.0.0"
                }
            }
        }
        
        response = await self._send_request(init_request)
        
        if response.get("result"):
            self.initialized = True
            logger.info("MCP connection initialized")
        else:
            raise Exception(f"Failed to initialize MCP connection: {response}")
    
    def _get_next_id(self) -> int:
        """Get next request ID"""
        self.request_id += 1
        return self.request_id
    
    async def _send_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Send a request to the MCP server"""
        if not self.process:
            raise Exception("MCP client not started")
        
        try:
            # Send request
            request_json = json.dumps(request) + "\n"
            self.process.stdin.write(request_json)
            self.process.stdin.flush()
            
            # Read response
            response_line = self.process.stdout.readline()
            if not response_line:
                raise Exception("No response from MCP server")
            
            response = json.loads(response_line.strip())
            return response
            
        except Exception as e:
            logger.error(f"Error sending request: {e}")
            raise
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools"""
        request = {
            "jsonrpc": "2.0",
            "id": self._get_next_id(),
            "method": "tools/list"
        }
        
        response = await self._send_request(request)
        return response.get("result", {}).get("tools", [])
    
    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool by name with arguments"""
        request = {
            "jsonrpc": "2.0",
            "id": self._get_next_id(),
            "method": "tools/call",
            "params": {
                "name": name,
                "arguments": arguments
            }
        }
        
        response = await self._send_request(request)
        result = response.get("result", {})
        
        # Parse the content if it's a string
        if isinstance(result.get("content"), list) and len(result["content"]) > 0:
            content = result["content"][0].get("text", "{}")
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"success": False, "error": "Invalid JSON response", "raw": content}
        
        return result
    
    async def search_products(
        self,
        query: str,
        limit: int = 10,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search for products"""
        return await self.call_tool("search_products", {
            "query": query,
            "limit": limit,
            "min_price": min_price,
            "max_price": max_price,
            "category": category
        })
    
    async def analyze_sentiment(
        self,
        texts: List[str],
        product_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Analyze sentiment of texts"""
        return await self.call_tool("analyze_sentiment", {
            "texts": texts,
            "product_id": product_id
        })
    
    async def summarize_sentiment_by_product(
        self,
        product_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Summarize sentiment by product"""
        return await self.call_tool("summarize_sentiment_by_product", {
            "product_id": product_id
        })
    
    async def get_revenue_analytics(
        self,
        month: Optional[int] = None,
        year: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get revenue analytics"""
        return await self.call_tool("get_revenue_analytics", {
            "month": month,
            "year": year,
            "start_date": start_date,
            "end_date": end_date
        })
    
    async def get_sales_performance(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get sales performance metrics"""
        return await self.call_tool("get_sales_performance", {
            "days": days
        })
    
    async def get_product_metrics(
        self,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get product metrics"""
        return await self.call_tool("get_product_metrics", {
            "limit": limit
        })
    
    async def generate_report(
        self,
        report_type: str = "summary",
        month: Optional[int] = None,
        year: Optional[int] = None,
        include_sentiment: bool = True,
        include_revenue: bool = True
    ) -> Dict[str, Any]:
        """Generate business report"""
        return await self.call_tool("generate_report", {
            "report_type": report_type,
            "month": month,
            "year": year,
            "include_sentiment": include_sentiment,
            "include_revenue": include_revenue
        })


# Global MCP client instance
_mcp_client: Optional[MCPStdioClient] = None


async def get_mcp_client() -> MCPStdioClient:
    """Get the global MCP client instance"""
    global _mcp_client
    
    if _mcp_client is None:
        _mcp_client = MCPStdioClient()
        await _mcp_client.start()
    
    return _mcp_client


async def close_mcp_client():
    """Close the global MCP client"""
    global _mcp_client
    
    if _mcp_client:
        await _mcp_client.stop()
        _mcp_client = None
