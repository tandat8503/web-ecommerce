import { useEffect, useRef, useState } from "react";
import { Button, Input, Avatar, Tooltip, message, Spin, Typography } from "antd";
import {
  MessageOutlined,
  SendOutlined,
  CloseOutlined,
  RobotOutlined,
  WifiOutlined,
  DisconnectOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiChatbotAPI, aiUtils } from "../../../api/aiChatbotAPI";
import { handleImageError, NO_IMAGE_SMALL, NO_IMAGE_TINY } from "../../../utils/imagePlaceholder";

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
  const [selectedImage, setSelectedImage] = useState(null); // For image upload
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
      let sid = localStorage.getItem('ai_user_session_id');
      if (!sid) {
        sid = aiUtils.generateSessionId();
        localStorage.setItem('ai_user_session_id', sid);
      }
      setSessionId(sid);

      // Check AI service availability (suppress errors - service may not be running)
      try {
        const isAvailable = await aiUtils.isServiceAvailable();
        setIsConnected(isAvailable);
        setConnectionStatus(isAvailable ? "connected" : "disconnected");

        if (isAvailable) {
          console.log("Professional AI Chatbot connected (HTTP mode)");

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
        console.error("Failed to initialize chat:", error);
      }
      setIsConnected(false);
      setConnectionStatus("error");
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      message.error('Vui lòng chọn file ảnh!');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      message.error('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB.');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      setSelectedImage(base64String);
      message.success('Đã chọn ảnh! Nhấn gửi để tìm sản phẩm tương tự.');
    };
    reader.onerror = () => {
      message.error('Lỗi khi đọc file ảnh!');
    };
    reader.readAsDataURL(file);
  };


  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || typing) return;

    const userMsg = {
      from: "user",
      text: input || (selectedImage ? "🖼️ [Hình ảnh]" : ""),
      timestamp: new Date().toISOString(),
      image: selectedImage // Store image preview
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const currentImage = selectedImage;
    setInput("");
    setSelectedImage(null); // Clear image after send
    setTyping(true);

    try {
      // Use HTTP API
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

      // Send with image if available
      const response = await aiChatbotAPI.sendMessage(
        currentInput || "Tìm sản phẩm tương tự như trong ảnh",
        sessionId,
        "user",
        userId,
        currentImage // Pass base64 image
      );

      // Update session_id if returned from backend
      if (response.session_id && response.session_id !== sessionId) {
        setSessionId(response.session_id);
      }

      let messageText = response.answer || response.response?.text || response.response || "Xin lỗi, không thể xử lý yêu cầu.";
      let messageType = response.type || response.response?.type || "text";
      let messageData = response.products || response.response?.data || null;

      // Backward compatibility for old string format
      if (typeof response.response === 'string') {
        messageText = response.response;
        messageType = "text";
      }

      const botMsg = {
        from: "bot",
        text: messageText,
        timestamp: response.timestamp || new Date().toISOString(),
        metadata: {
          response_time: response.response_time || 0,
          model: response.metadata?.model || response.metadata?.agent_type || "professional_ai_chatbot",
          success: response.success !== false
        },
        //Map to product_recommendation when products array is available
        type: (messageType === "product" && messageData?.length > 0) ? "product_recommendation" : messageType,
        data: messageData,
        cross_sell: response.cross_sell || null,
        suggest_contact: response.suggest_contact || false
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
   * Render product card component with improved styling
   */
  const renderProductCard = (product) => {
    return (
      <div
        key={product.id}
        className="border rounded-lg p-3 min-w-[200px] max-w-[200px] bg-white shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 hover:border-blue-400"
        onClick={() => {
          navigate(product.link || `/san-pham/${product.id || product.slug}`);
          setOpen(false);
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-36 object-cover rounded mb-3 border border-gray-100"
            onError={(e) => handleImageError(e, 'small')}

          />
        ) : (
          <div className="w-full h-36 bg-gray-100 rounded mb-3 flex items-center justify-center border border-gray-200">
            <span className="text-gray-400 text-xs">Chưa có ảnh</span>
          </div>
        )}
        <div className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]" title={product.name}>
          {product.name}
        </div>
        {product.category && (
          <div className="text-xs text-gray-500 mb-2 px-1">{product.category}</div>
        )}
        <div className="flex flex-col space-y-1 mb-3">
          {product.sale_price ? (
            <>
              <div className="flex items-center space-x-2">
                <span className="text-red-500 font-bold text-base">
                  {formatPrice(product.sale_price)}
                </span>
                <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded">
                  Giảm giá
                </span>
              </div>
              <span className="text-gray-400 line-through text-xs">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span className="text-red-500 font-bold text-base">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        <Button
          type="primary"
          size="small"
          className="w-full mt-auto"
          onClick={(e) => {
            e.stopPropagation();
            navigate(product.link || `/san-pham/${product.id || product.slug}`);
            setOpen(false);
          }}
        >
          Xem chi tiết
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
                    className={`max-w-[80%] p-3 rounded-lg ${msg.from === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {/* Render text message with Markdown support */}
                    <div className="text-sm break-words">
                      {msg.from === "bot" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Customize HTML tags rendering
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({ node, ...props }) => <ul className="mb-2 ml-4 list-disc" {...props} />,
                            ol: ({ node, ...props }) => <ol className="mb-2 ml-4 list-decimal" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                            a: ({ node, href, ...props }) => {
                              // Handle product links
                              if (href && (href.startsWith('/san-pham/') || href.startsWith('/product/'))) {
                                return (
                                  <Link
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigate(href);
                                      setOpen(false);
                                    }}
                                    style={{
                                      color: "#1890ff",
                                      textDecoration: "underline",
                                      cursor: "pointer"
                                    }}
                                    {...props}
                                  >
                                    {props.children}
                                  </Link>
                                );
                              }
                              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline" {...props} />;
                            },
                            strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                            em: ({ node, ...props }) => <em className="italic" {...props} />,
                            blockquote: ({ node, ...props }) => (
                              <blockquote className="border-l-4 border-gray-300 pl-3 my-2 italic text-gray-600" {...props} />
                            ),
                            code: ({ node, inline, ...props }) =>
                              inline ? (
                                <code className="bg-gray-200 px-1 py-0.5 rounded text-xs" {...props} />
                              ) : (
                                <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto" {...props} />
                              ),
                            img: ({ node, src, alt, ...props }) => (
                              <img
                                src={src}
                                alt={alt}
                                className="max-w-full h-auto rounded my-2"
                                onError={(e) => {
                                  handleImageError(e, 'small');
                                }}
                                {...props}
                              />
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        <>
                          {/* Show image if user uploaded one */}
                          {msg.image && (
                            <div className="mb-2">
                              <img
                                src={`data:image/jpeg;base64,${msg.image}`}
                                alt="Uploaded"
                                className="max-w-full rounded border border-blue-300"
                                style={{ maxHeight: '200px', objectFit: 'contain' }}
                              />
                            </div>
                          )}
                          <span className="whitespace-pre-wrap">{msg.text}</span>
                        </>
                      )}
                    </div>

                    {/* Render product cards if type is product_recommendation */}
                    {msg.from === "bot" && msg.type === "product_recommendation" && msg.data && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-600 mb-3 px-1">
                          🛍️ Sản phẩm gợi ý:
                        </div>
                        <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {msg.data.map((product) => renderProductCard(product))}
                        </div>
                      </div>
                    )}

                    {/* Render cross-sell products */}
                    {msg.from === "bot" && msg.cross_sell && msg.cross_sell.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-600 mb-3 px-1">
                          💡 Gợi ý thêm:
                        </div>
                        <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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

                    <div className={`text-xs mt-1 ${msg.from === "user" ? "text-blue-100" : "text-gray-500"
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
              {/* Image preview */}
              {selectedImage && (
                <div className="mb-2 relative inline-block">
                  <div className="w-20 h-20 rounded border border-gray-300 overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${selectedImage}`}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    className="absolute -top-2 -right-2"
                    onClick={() => setSelectedImage(null)}
                  />
                </div>
              )}

              <div className="flex space-x-2">
                {/* Image upload button */}
                <Tooltip title="Upload ảnh sản phẩm để tìm kiếm">
                  <label
                    htmlFor="image-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: (!isConnected || typing) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      id="image-upload"
                      disabled={!isConnected || typing}
                    />
                    <div
                      className={`ant-btn ant-btn-default ${(!isConnected || typing) ? 'ant-btn-disabled' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 15px',
                        pointerEvents: (!isConnected || typing) ? 'none' : 'auto'
                      }}
                    >
                      <PictureOutlined />
                    </div>
                  </label>
                </Tooltip>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isConnected
                      ? "Nhập tin nhắn hoặc upload ảnh..."
                      : "AI không khả dụng..."
                  }
                  disabled={!isConnected || typing}
                  className="flex-1"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage) || typing || !isConnected}
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