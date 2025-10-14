import { useEffect, useRef, useState } from "react";
import { Button, Input, Avatar, Tooltip, message, Spin, Typography } from "antd";
import {
  MessageOutlined,
  SendOutlined,
  CloseOutlined,
  RobotOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { aiChatbotAPI, aiUtils, AIWebSocketClient } from "../../../api/aiChatbotAPI";

const { Text } = Typography;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      from: "bot", 
      text: "Xin chào! Tôi là AI tư vấn chuyên nghiệp của cửa hàng nội thất văn phòng. Bạn cần tư vấn gì ạ?",
      timestamp: new Date().toISOString(),
      metadata: {
        response_time: 0,
        model: "professional_ai_chatbot"
      }
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [wsClient, setWsClient] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);

  // Initialize session and check connection
  useEffect(() => {
    initializeChat();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Generate session ID
      const newSessionId = aiUtils.generateSessionId();
      setSessionId(newSessionId);

      // Check AI service availability
      const isAvailable = await aiUtils.isServiceAvailable();
      setIsConnected(isAvailable);
      setConnectionStatus(isAvailable ? "connected" : "disconnected");

      if (isAvailable) {
        console.log("✅ Professional AI Chatbot connected");
        
        // Initialize WebSocket for real-time features
        const ws = new AIWebSocketClient();
        await ws.connect(newSessionId);
        
        // Set up WebSocket event listeners
        ws.addEventListener("message", handleWebSocketMessage);
        ws.addEventListener("typing", handleTypingIndicator);
        ws.addEventListener("error", handleWebSocketError);
        
        setWsClient(ws);
      } else {
        console.warn("⚠️ Professional AI Chatbot not available");
      }
    } catch (error) {
      console.error("❌ Failed to initialize chat:", error);
      setIsConnected(false);
      setConnectionStatus("error");
    }
  };

  const handleWebSocketMessage = (data) => {
    if (data.type === "message") {
      const botMsg = {
        from: "bot",
        text: data.content,
        timestamp: new Date().toISOString(),
        metadata: {
          response_time: data.response_time,
          model: data.model || "professional_ai_chatbot",
          streaming: data.streaming || false
        }
      };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
      setStreaming(false);
    }
  };

  const handleTypingIndicator = (data) => {
    if (data.type === "typing") {
      setTyping(data.typing);
    }
  };

  const handleWebSocketError = (data) => {
    console.error("WebSocket error:", data);
    setTyping(false);
    setStreaming(false);
  };

  const handleSend = async () => {
    if (!input.trim() || typing) return;

    const userMsg = { 
      from: "user", 
      text: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      if (isConnected && wsClient) {
        // Use WebSocket for real-time communication
        wsClient.sendMessage(input);
        setStreaming(true);
      } else {
        // Fallback to HTTP API
        const response = await aiChatbotAPI.sendMessage(input, sessionId);
        
      const botMsg = {
          from: "bot",
          text: response.response,
          timestamp: response.timestamp,
          metadata: {
            response_time: response.response_time,
            model: response.metadata?.model || "professional_ai_chatbot"
          }
        };
        setMessages(prev => [...prev, botMsg]);
        setTyping(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMsg = {
        from: "bot",
        text: isConnected 
          ? "Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn. Vui lòng thử lại sau."
          : "AI Chatbot hiện không khả dụng. Vui lòng liên hệ trực tiếp với chúng tôi qua hotline: 0123-456-789",
        timestamp: new Date().toISOString(),
        metadata: {
          error: true,
          error_message: aiUtils.getErrorMessage(error)
        }
      };
      setMessages(prev => [...prev, errorMsg]);
      setTyping(false);
      setStreaming(false);

      // Show error notification
      message.error(aiUtils.getErrorMessage(error));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <WifiOutlined style={{ color: "#52c41a" }} />;
      case "disconnected":
        return <DisconnectOutlined style={{ color: "#ff4d4f" }} />;
      case "checking":
        return <Spin size="small" />;
      default:
        return <DisconnectOutlined style={{ color: "#ff4d4f" }} />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case "connected":
        return "AI Connected";
      case "disconnected":
        return "AI Disconnected";
      case "checking":
        return "Checking...";
      default:
        return "AI Error";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-white rounded-lg shadow-2xl w-96 h-[500px] flex flex-col border border-gray-200"
          >
              {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-2">
                <Avatar 
                  icon={<RobotOutlined />} 
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                />
                <div>
                  <div className="font-semibold">AI Tư Vấn</div>
                  <div className="flex items-center space-x-1 text-xs">
                    {getConnectionIcon()}
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>
                      {getConnectionText()}
                    </Text>
                  </div>
                </div>
                </div>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => setOpen(false)}
                style={{ color: "white" }}
                />
              </div>

            {/* Messages */}
              <div
                ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
              >
              {messages.map((msg, index) => (
                  <motion.div
                  key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                        msg.from === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="text-sm">{msg.text}</div>
                    <div className={`text-xs mt-1 ${
                      msg.from === "user" ? "text-blue-100" : "text-gray-500"
                    }`}>
                      {formatTime(msg.timestamp)}
                      {msg.metadata?.response_time && (
                        <span className="ml-2">
                          ({aiUtils.formatResponseTime(msg.metadata.response_time)})
                        </span>
                      )}
                    </div>
                    {msg.metadata?.error && (
                      <div className="text-xs text-red-500 mt-1">
                        ⚠️ {msg.metadata.error_message}
                      </div>
                    )}
                    </div>
                  </motion.div>
                ))}

                  {typing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        AI đang suy nghĩ...
                      </span>
                    </div>
                      </div>
                    </motion.div>
                  )}
              </div>

              {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isConnected 
                      ? "Nhập tin nhắn của bạn..." 
                      : "AI không khả dụng..."
                  }
                  disabled={!isConnected || typing}
                  className="flex-1"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={!input.trim() || typing || !isConnected}
                  loading={typing}
                />
              </div>
              {!isConnected && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                  <Text type="secondary">
                    AI service không khả dụng. Vui lòng thử lại sau.
                  </Text>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<MessageOutlined />}
          onClick={() => setOpen(!open)}
          className="shadow-lg"
          style={{
            backgroundColor: "#1890ff",
            borderColor: "#1890ff",
          }}
        />
      </motion.div>
    </div>
  );
}