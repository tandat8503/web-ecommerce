import { useEffect, useRef, useState } from "react";
import { Button, Input, Avatar, Tooltip } from "antd";
import {
  MessageOutlined,
  SendOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "✨ Xin chào! Mình là Magic Assistant — có thể giúp gì cho bạn?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { from: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Giả lập bot trả lời
    setTimeout(() => {
      const botMsg = {
        from: "bot",
        text: "🌸 Cảm ơn bạn! Tính năng AI sắp ra mắt, vui lòng đợi nhé!",
      };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    }, 1500);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  return (
    <>
      {/* Floating button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Tooltip title="Chatbox">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<MessageOutlined />}
            onClick={() => setOpen(!open)}
            className="shadow-xl border-none bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white hover:shadow-fuchsia-300/40 transition-all duration-300"
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
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white">
                <div className="flex items-center gap-2">
                  <Avatar className="bg-white text-lg">🤖</Avatar>
                  <div className="font-semibold">Magic Assistant</div>
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
                        className="mr-2 bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                      >
                        🤖
                      </Avatar>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm ${
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
                  placeholder="Nhập tin nhắn..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPressEnter={handleSend}
                  className="rounded-full px-4"
                />
                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 border-none hover:opacity-90"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
