import { useEffect, useRef, useState } from "react";
import { Button, Input, Avatar, Tooltip, message, Spin, Typography, Tag } from "antd";
import {
  MessageOutlined,
  SendOutlined,
  CloseOutlined,
  RobotOutlined,
  WifiOutlined,
  DisconnectOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { aiChatbotAPI, aiUtils, AIWebSocketClient } from "../../../api/aiChatbotAPI";
import ReportProgressCard from "../../../components/reports/ReportProgressCard";
import ReportCard from "../../../components/reports/ReportCard";

const { Text } = Typography;

export default function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      from: "bot", 
      text: "Xin chào Admin! Tôi là AI Business Assistant. Tôi có thể giúp bạn:\n• Phân tích doanh thu và KPI\n• Phân tích sentiment khách hàng\n• Tạo báo cáo tự động\n• Phân tích hiệu suất sản phẩm\n• Tư vấn luật pháp & Tính thuế\n\nBạn muốn hỏi gì ạ?",
      timestamp: new Date().toISOString(),
      metadata: {
        response_time: 0,
        model: "admin_chatbot"
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
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState([]);
  const [completedReport, setCompletedReport] = useState(null);
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
          console.log("✅ Admin AI Chatbot connected");
          
          // Initialize WebSocket for real-time features (optional)
          try {
            const ws = new AIWebSocketClient();
            await ws.connect(newSessionId);
            
            // Set up WebSocket event listeners
            ws.addEventListener("message", handleWebSocketMessage);
            ws.addEventListener("typing", handleTypingIndicator);
            ws.addEventListener("error", handleWebSocketError);
            
            setWsClient(ws);
          } catch (wsError) {
            // WebSocket not available - use HTTP fallback (expected)
            console.log("Using HTTP fallback for admin chat");
          }
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

  const handleWebSocketMessage = (data) => {
    if (data.type === "message") {
      const botMsg = {
        from: "bot",
        text: data.content,
        timestamp: new Date().toISOString(),
        metadata: {
          response_time: data.response_time,
          model: data.model || "admin_chatbot",
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

  // Detect report generation request
  const isReportRequest = (text) => {
    const reportKeywords = [
      "báo cáo",
      "report",
      "xuất báo cáo",
      "tạo báo cáo",
      "phân tích sentiment",
      "phân tích doanh thu",
      "phân tích sản phẩm",
      "phân tích khách hàng",
    ];
    const lowerText = text.toLowerCase();
    return reportKeywords.some((keyword) => lowerText.includes(keyword));
  };

  // Detect legal/tax query
  const isLegalOrTaxQuery = (text) => {
    const legalKeywords = [
      "luật", "pháp luật", "văn bản", "nghị định", "thông tư",
      "điều kiện", "quy định", "thành lập công ty", "doanh nghiệp",
      "thuế", "tính thuế", "đóng thuế", "thuế tncn", "thuế thu nhập",
      "lương gross", "lương net", "bảo hiểm", "bhxh", "bhyt", "bhtn"
    ];
    const lowerText = text.toLowerCase();
    return legalKeywords.some((keyword) => lowerText.includes(keyword));
  };

  // Extract report type from request
  const extractReportType = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("sentiment") || lowerText.includes("cảm xúc")) {
      return "sentiment";
    }
    if (lowerText.includes("revenue") || lowerText.includes("doanh thu")) {
      return "revenue";
    }
    if (lowerText.includes("product") || lowerText.includes("sản phẩm")) {
      return "product";
    }
    if (lowerText.includes("customer") || lowerText.includes("khách hàng")) {
      return "customer";
    }
    return "business";
  };

  const handleGenerateReport = async (reportType, userInput) => {
    setGeneratingReport(true);
    setReportProgress([]);
    setCompletedReport(null);

    const progressEvents = [];

    try {
      await aiChatbotAPI.generateReport(
        {
          report_type: reportType,
          period: "Tháng hiện tại",
        },
        (event) => {
          progressEvents.push(event);
          setReportProgress([...progressEvents]);

          // If completed, show report card
          if (event.step_name === "COMPLETED") {
            setCompletedReport({
              id: event.details.report_id,
              report_type: reportType,
              title: `Báo cáo ${reportType}`,
              period: "Tháng hiện tại",
              created_at: new Date().toISOString(),
              file_size: event.details.file_size,
              report_url: event.details.report_url,
            });
            setGeneratingReport(false);
            message.success("Báo cáo đã được tạo thành công!");
          }
        }
      );
    } catch (error) {
      console.error("Error generating report:", error);
      message.error("Lỗi khi tạo báo cáo: " + aiUtils.getErrorMessage(error));
      setGeneratingReport(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || typing || generatingReport) return;

    const userInput = input.trim();
    const userMsg = { 
      from: "user", 
      text: userInput,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      // Check if this is a report generation request
      if (isReportRequest(userInput)) {
        const reportType = extractReportType(userInput);
        
        const botMsg = {
          from: "bot",
          text: `Đang tạo báo cáo ${reportType}...`,
          timestamp: new Date().toISOString(),
          metadata: {
            isReportGeneration: true,
            reportType: reportType,
          }
        };
        setMessages(prev => [...prev, botMsg]);
        setTyping(false);
        
        // Start report generation
        await handleGenerateReport(reportType, userInput);
        return;
      }

      // Check if this is a legal/tax query
      if (isLegalOrTaxQuery(userInput)) {
        try {
          const response = await aiChatbotAPI.askLegalAdvisor(userInput, 1); // Default region 1 (Vùng I)
          
          const botMsg = {
            from: "bot",
            text: response.response || "Xin lỗi, tôi không thể xử lý yêu cầu của bạn.",
            timestamp: response.timestamp || new Date().toISOString(),
            metadata: {
              response_time: 0,
              model: response.metadata?.model || "legal_assistant",
              query_type: response.query_type || "legal",
              success: response.success
            }
          };
          setMessages(prev => [...prev, botMsg]);
          setTyping(false);
          return;
        } catch (legalError) {
          console.error("Legal advisor error:", legalError);
          // Fall through to regular admin chatbot
        }
      }

      if (isConnected && wsClient) {
        // Use WebSocket for real-time communication
        wsClient.sendMessage(userInput);
        setStreaming(true);
      } else {
        // Fallback to HTTP API - Admin chatbot for business intelligence
        const response = await aiChatbotAPI.sendAdminMessage(userInput);
        
        const botMsg = {
          from: "bot",
          text: response.response || response.message || "Xin lỗi, tôi không thể xử lý yêu cầu của bạn.",
          timestamp: response.timestamp || new Date().toISOString(),
          metadata: {
            response_time: response.response_time,
            model: response.metadata?.model || response.agent_type || "admin_chatbot",
            data: response.data || null
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
          : "AI Business Assistant hiện không khả dụng. Vui lòng kiểm tra lại kết nối.",
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
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-2">
                <Avatar 
                  icon={<BarChartOutlined />} 
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                />
                <div>
                  <div className="font-semibold">AI Business Assistant</div>
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
              {/* Report Progress Card */}
              {generatingReport && reportProgress.length > 0 && (
                <div className="mb-4">
                  <ReportProgressCard progressEvents={reportProgress} />
                </div>
              )}

              {/* Completed Report Card */}
              {completedReport && (
                <div className="mb-4">
                  <ReportCard report={completedReport} />
                </div>
              )}

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
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-line">{msg.text}</div>
                    <div className={`text-xs mt-1 ${
                      msg.from === "user" ? "text-purple-100" : "text-gray-500"
                    }`}>
                      {formatTime(msg.timestamp)}
                      {msg.metadata?.response_time && (
                        <span className="ml-2">
                          ({aiUtils.formatResponseTime(msg.metadata.response_time)})
                        </span>
                      )}
                    </div>
                    {msg.metadata?.data && (
                      <div className="mt-2 text-xs">
                        <Tag color="blue">Data Available</Tag>
                      </div>
                    )}
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
                        AI đang phân tích...
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
                      ? "Hỏi về doanh thu, sentiment, báo cáo, luật pháp, tính thuế..." 
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
                  style={{ backgroundColor: "#722ed1", borderColor: "#722ed1" }}
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
          icon={<BarChartOutlined />}
          onClick={() => setOpen(!open)}
          className="shadow-lg"
          style={{
            backgroundColor: "#722ed1",
            borderColor: "#722ed1",
          }}
        />
      </motion.div>
    </div>
  );
}

