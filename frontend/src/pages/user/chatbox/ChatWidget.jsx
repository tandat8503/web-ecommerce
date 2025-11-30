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
import { useNavigate } from "react-router-dom";
import { aiChatbotAPI, aiUtils } from "../../../api/aiChatbotAPI";

const { Text, Link } = Typography;

export default function ChatWidget() {
  const navigate = useNavigate();
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

      // Check AI service availability (suppress errors - service may not be running)
      try {
        const isAvailable = await aiUtils.isServiceAvailable();
        setIsConnected(isAvailable);
        setConnectionStatus(isAvailable ? "connected" : "disconnected");

        if (isAvailable) {
          console.log("✅ Professional AI Chatbot connected (HTTP mode)");
          
          // Note: Backend currently doesn't support WebSocket
          // Using HTTP API only - no WebSocket connection needed
          // WebSocket can be enabled in the future if backend supports it
        }
        // Don't log warning - service not running is acceptable
      } catch (availabilityError) {
        // Service check failed - gracefully degrade
        setIsConnected(false);
        setConnectionStatus("disconnected");
      }
    } catch (error) {
      // Only log unexpected errors (not connection refused)
      if (error.code !== 'ECONNREFUSED' && error.code !== 'ERR_NETWORK') {
        console.error("❌ Failed to initialize chat:", error);
      }
      setIsConnected(false);
      setConnectionStatus("error");
    }
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
      // Use HTTP API (backend doesn't support WebSocket currently)
      // Get user_id from localStorage if available
      let userId = null;
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          userId = user.id || user.userId || null;
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      
      const response = await aiChatbotAPI.sendMessage(input, sessionId, "user", userId);
      
      // Update session_id if returned from backend
      if (response.session_id && response.session_id !== sessionId) {
        setSessionId(response.session_id);
      }
      
      // Handle structured response (new format) or string response (old format)
      let responseData = response.response;
      if (typeof responseData === 'string') {
        // Old format - convert to structured
        responseData = { text: responseData, type: "text" };
      }
      
      const botMsg = {
        from: "bot",
        text: responseData.text || responseData || "Xin lỗi, không thể xử lý yêu cầu.",
        timestamp: response.timestamp || new Date().toISOString(),
        metadata: {
          response_time: response.response_time || 0,
          model: response.metadata?.model || response.metadata?.agent_type || "professional_ai_chatbot",
          success: response.success !== false
        },
        // Add structured response data
        type: responseData.type || "text",
        data: responseData.data || null,
        cross_sell: responseData.cross_sell || null,
        suggest_contact: responseData.suggest_contact || false
      };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
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

  /**
   * Format price for display
   */
  const formatPrice = (price) => {
    if (!price) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(price);
  };

  /**
   * Render product card component
   */
  const renderProductCard = (product) => {
    return (
      <div
        key={product.id}
        className="border rounded-lg p-3 min-w-[180px] bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          navigate(product.link || `/san-pham/${product.id || product.slug}`);
          setOpen(false);
        }}
      >
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-32 object-cover rounded mb-2"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/180x128?text=No+Image";
            }}
          />
        )}
        <div className="font-semibold text-sm truncate mb-1" title={product.name}>
          {product.name}
        </div>
        {product.category && (
          <div className="text-xs text-gray-500 mb-2">{product.category}</div>
        )}
        <div className="flex items-center space-x-2">
          {product.sale_price ? (
            <>
              <span className="text-red-500 font-bold text-sm">
                {formatPrice(product.sale_price)}
              </span>
              <span className="text-gray-400 line-through text-xs">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span className="text-red-500 font-bold text-sm">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        <Button
          type="primary"
          size="small"
          className="w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            navigate(product.link || `/san-pham/${product.id || product.slug}`);
            setOpen(false);
          }}
        >
          Xem ngay
        </Button>
      </div>
    );
  };

  /**
   * Parse text and render links as clickable elements
   * Supports /san-pham/{id} and /product/{slug} formats
   */
  const renderMessageWithLinks = (text) => {
    if (!text) return text;

    // Pattern to match /san-pham/{id} or /product/{slug} links
    const productLinkPattern = /(\/(?:san-pham|product)\/[a-zA-Z0-9\-_]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = productLinkPattern.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add clickable link
      const linkPath = match[0];
      parts.push(
        <Link
          key={match.index}
          onClick={(e) => {
            e.preventDefault();
            // Navigate to product page
            navigate(linkPath);
            // Close chat widget after navigation
            setOpen(false);
          }}
          style={{ 
            color: "#1890ff",
            textDecoration: "underline",
            cursor: "pointer"
          }}
        >
          {linkPath}
        </Link>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no links found, return original text
    if (parts.length === 0) {
      return text;
    }

    return parts;
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
                    {/* Render text message */}
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.from === "bot" ? renderMessageWithLinks(msg.text) : msg.text}
                    </div>
                    
                    {/* Render product cards if type is product_recommendation */}
                    {msg.from === "bot" && msg.type === "product_recommendation" && msg.data && (
                      <div className="mt-3">
                        <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1">
                          {msg.data.map((product) => renderProductCard(product))}
                        </div>
                      </div>
                    )}
                    
                    {/* Render cross-sell products */}
                    {msg.from === "bot" && msg.cross_sell && msg.cross_sell.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="text-xs text-gray-600 mb-2 font-semibold">
                          💡 Gợi ý thêm:
                        </div>
                        <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1">
                          {msg.cross_sell.map((product) => renderProductCard(product))}
                        </div>
                      </div>
                    )}
                    
                    {/* Suggest contact form if needed */}
                    {msg.from === "bot" && msg.suggest_contact && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="text-xs text-gray-600 mb-2">
                          💬 Mẫu này đang cháy hàng, bạn để lại số điện thoại, khi nào hàng về em nhắn Zalo cho bạn ngay ạ!
                        </div>
                        <Input
                          placeholder="Nhập số điện thoại của bạn..."
                          size="small"
                          className="mt-2"
                          onPressEnter={(e) => {
                            const phone = e.target.value;
                            if (phone) {
                              // TODO: Send phone to backend for lead collection
                              message.success("Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất có thể.");
                              e.target.value = "";
                            }
                          }}
                        />
                        <Button
                          type="primary"
                          size="small"
                          className="w-full mt-2"
                          onClick={(e) => {
                            const input = e.target.closest('.border-t').querySelector('input');
                            const phone = input?.value;
                            if (phone) {
                              // TODO: Send phone to backend for lead collection
                              message.success("Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất có thể.");
                              input.value = "";
                            } else {
                              message.warning("Vui lòng nhập số điện thoại");
                            }
                          }}
                        >
                          Gửi số điện thoại
                        </Button>
                      </div>
                    )}
                    
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