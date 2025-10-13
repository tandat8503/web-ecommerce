import { useEffect, useRef, useState } from "react";
import { Button, Input, Avatar, Tooltip, message } from "antd";
import {
  MessageOutlined,
  SendOutlined,
  CloseOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { aiAPI } from "../../../api/aiAPI";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      from: "bot", 
      text: "Xin chào! Tôi là nhân viên tư vấn AI của cửa hàng nội thất văn phòng. Tôi có thể giúp bạn tìm hiểu về sản phẩm, giá cả và dịch vụ từ database thực. Bạn cần tư vấn gì ạ?",
      timestamp: new Date().toISOString()
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef(null);

  // Kiểm tra kết nối AI khi component mount
  useEffect(() => {
    checkAIConnection();
  }, []);

  const checkAIConnection = async () => {
    try {
      await aiAPI.healthCheck();
      setIsConnected(true);
      console.log("✅ AI Chatbot connected");
    } catch (error) {
      setIsConnected(false);
      console.warn("⚠️ AI Chatbot not available:", error.message);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { 
      from: "user", 
      text: input,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
        // Gửi tin nhắn đến AI backend
        const response = await aiAPI.sendMessage(input, sessionId);
      
      const botMsg = {
        from: "bot",
        text: response.response || "Xin lỗi, tôi không thể trả lời câu hỏi này.",
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, botMsg]);
      
      // Lưu session ID nếu có
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Fallback response khi AI không khả dụng
      const fallbackMsg = {
        from: "bot",
        text: isConnected 
          ? "Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn. Vui lòng thử lại sau."
          : "AI Chatbot hiện không khả dụng. Vui lòng liên hệ trực tiếp với chúng tôi qua hotline: 0123-456-789",
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, fallbackMsg]);
      
      // Hiển thị thông báo lỗi
      message.error("Không thể kết nối đến AI Chatbot");
    } finally {
      setTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Floating button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Tooltip title={isConnected ? "AI Chatbot" : "Chatbot (Offline)"}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<RobotOutlined />}
            onClick={() => setOpen(!open)}
            className={`shadow-xl border-none text-white hover:shadow-fuchsia-300/40 transition-all duration-300 ${
              isConnected 
                ? "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" 
                : "bg-gradient-to-r from-gray-400 to-gray-500"
            }`}
          />
        </Tooltip>
      </motion.div>

      {/* Chat box */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed bottom-24 right-6 w-80 z-50"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-fuchsia-400/20 dark:border-fuchsia-600/20 bg-white/90 dark:bg-neutral-900/95 backdrop-blur-lg">
              {/* Header */}
              <div className={`flex items-center justify-between p-3 text-white ${
                isConnected 
                  ? "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" 
                  : "bg-gradient-to-r from-gray-400 to-gray-500"
              }`}>
                <div className="flex items-center gap-2">
                  <Avatar className="bg-white text-lg">
                    {isConnected ? "🤖" : "⚠️"}
                  </Avatar>
                  <div>
                    <div className="font-semibold">
                      {isConnected ? "AI Assistant" : "Chatbot (Offline)"}
                    </div>
                    <div className="text-xs opacity-80">
                      {isConnected ? "Đang hoạt động" : "Không kết nối được"}
                    </div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => setOpen(false)}
                  className="text-white hover:text-gray-200"
                />
              </div>

              {/* Content */}
              <div
                ref={scrollRef}
                className="h-80 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-fuchsia-400/40"
              >
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.from === "bot" && (
                      <Avatar
                        size={27}
                        className={`mr-2 ${
                          isConnected 
                            ? "bg-gradient-to-r from-indigo-400 to-fuchsia-400" 
                            : "bg-gradient-to-r from-gray-400 to-gray-500"
                        }`}
                      >
                        {isConnected ? "🤖" : "⚠️"}
                      </Avatar>
                    )}
                    <div className="flex flex-col max-w-[75%]">
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm ${
                          msg.from === "user"
                            ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md"
                            : "bg-gray-100 dark:bg-neutral-800 dark:text-gray-100 border border-white/10"
                        }`}
                        style={{
                          borderTopLeftRadius: msg.from === "bot" ? "0.25rem" : "1rem",
                          borderTopRightRadius: msg.from === "user" ? "0.25rem" : "1rem",
                        }}
                      >
                        {msg.text}
                      </div>
                      <div className={`text-xs text-gray-400 mt-1 ${
                        msg.from === "user" ? "text-right" : "text-left"
                      }`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Typing animation */}
                <AnimatePresence>
                  {typing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300"
                    >
                      <Avatar size={24} className="bg-gradient-to-r from-purple-400 to-pink-400">
                        🤖
                      </Avatar>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 p-3 bg-white/70 dark:bg-neutral-900/80 border-t border-fuchsia-400/20">
                <Input
                  placeholder={isConnected ? "Nhập tin nhắn..." : "Chatbot đang offline..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isConnected}
                  className="rounded-full px-4"
                />
                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={!isConnected || !input.trim()}
                  className={`border-none hover:opacity-90 ${
                    isConnected 
                      ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500" 
                      : "bg-gray-400"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
