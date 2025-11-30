/**
 * Professional AI Chatbot API Client
 * Handles all communication with the new FastAPI backend
 */

import axios from "axios";

// API Configuration
const AI_API_URL = "http://localhost:8000";
const AI_WS_URL = "ws://localhost:8000/ws"; // (chưa dùng, backend hiện không có ws)

// Create axios instance with default config
const aiAxiosClient = axios.create({
  baseURL: AI_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for logging
aiAxiosClient.interceptors.request.use(
  (config) => {
    // Suppress logging for health checks to reduce console noise
    if (config.url !== '/health') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error("❌ API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
aiAxiosClient.interceptors.response.use(
  (response) => {
    // Suppress logging for health checks
    if (response.config.url !== '/health') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Completely suppress connection errors for health checks
    // These are expected when AI service is not running
    if ((error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') && 
        error.config?.url === '/health') {
      // Silent - service not running is acceptable, don't log anything
      return Promise.reject(error);
    }
    
    // Only log actual errors (not expected connection failures)
    if (error.response?.status >= 400 && error.response?.status !== 404) {
      console.error("❌ API Response Error:", error.response?.status, error.config?.url);
    } else if (error.code !== 'ECONNREFUSED' && error.code !== 'ERR_NETWORK') {
      // Only log non-connection errors
      console.error("❌ API Error:", error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Professional AI Chatbot API Client
 * Provides methods for interacting with the AI chatbot system
 */
export const aiChatbotAPI = {
  /**
   * Health check endpoint
   * @returns {Promise<Object>} Health status
   */
  healthCheck: async () => {
    try {
      const response = await aiAxiosClient.get("/health");
      return response.data;
    } catch (error) {
      // Suppress error logging for health check - service not running is acceptable
      // Only log if it's not a connection error
      if (error.code !== 'ECONNREFUSED' && error.code !== 'ERR_NETWORK') {
        console.error("Health check failed:", error);
      }
      throw error;
    }
  },

  /**
   * Send a message to the chatbot (main method)
   * @param {string} message - User message
   * @param {string} sessionId - Optional session ID
   * @param {string} userType - User type: "user" or "admin" (default: "user")
   * @returns {Promise<Object>} Bot response
   */
  sendMessage: async (message, sessionId = null, userType = "user", userId = null) => {
    try {
      // Try to get user_id from localStorage if not provided
      if (!userId && typeof window !== 'undefined') {
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            userId = user.id || user.userId || null;
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
      
      const payload = {
        message: message.trim(),
        user_type: userType,
        session_id: sessionId,
        context: {},
        ...(userId && { user_id: userId })
      };
      const startTime = Date.now();
      const response = await aiAxiosClient.post("/chat", payload);
      const responseTime = (Date.now() - startTime) / 1000; // in seconds
      
      // Transform response to match expected format
      const data = response.data;
      
      // Update session_id if returned from backend
      if (data.session_id && data.session_id !== sessionId) {
        // Session ID was generated/updated by backend
      }
      
      return {
        response: data.response || data.message || "Xin lỗi, không thể xử lý yêu cầu.",
        timestamp: data.timestamp || new Date().toISOString(),
        response_time: responseTime,
        metadata: {
          model: data.agent_type || "professional_ai_chatbot",
          session_id: data.session_id || sessionId,
          success: data.success !== false,
          agent_type: data.agent_type
        },
        data: data.data,
        session_id: data.session_id || sessionId,
        success: data.success !== false
      };
    } catch (error) {
      console.error("Send message failed:", error);
      
      // Return error response in expected format
      if (error.response?.data) {
        const errorData = error.response.data;
        return {
          response: errorData.response || errorData.error || "Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn.",
          timestamp: new Date().toISOString(),
          response_time: 0,
          metadata: {
            model: "error",
            session_id: sessionId,
            success: false,
            error: true,
            error_message: errorData.error || error.message
          },
          success: false,
          session_id: sessionId
        };
      }
      
      throw error;
    }
  },

  /**
   * Send a message to the chatbot (user - product consultation)
   * @param {string} message - User message
   * @param {string} sessionId - Optional session ID
   * @returns {Promise<Object>} Bot response
   */
  sendUserMessage: async (message, sessionId = null) => {
    return await aiChatbotAPI.sendMessage(message, sessionId, "user");
  },

  /**
   * Send a message to the chatbot (admin - business intelligence)
   * @param {string} message - Admin message
   * @param {string} sessionId - Optional session ID
   * @returns {Promise<Object>} Bot response
   */
  sendAdminMessage: async (message, sessionId = null) => {
    return await aiChatbotAPI.sendMessage(message, sessionId, "admin");
  },

  /**
   * Process a conversation with multiple messages
   * @param {Array} messages - Array of message objects
   * @param {boolean} stream - Whether to stream responses
   * @returns {Promise<Object>} Conversation responses
   */
  processConversation: async (messages, stream = false) => {
    try {
      const payload = {
        messages: messages,
        stream: stream
      };

      // Backend hiện không có endpoint này; để tương thích tương lai, tạm trả lỗi if gọi nhầm
      const response = await aiAxiosClient.post("/conversation", payload);
      return response.data;
    } catch (error) {
      console.error("Process conversation failed:", error);
      throw error;
    }
  },

  /**
   * Get conversation history for a session
   * @param {string} sessionId - Session ID
   * @param {number} limit - Maximum number of messages
   * @returns {Promise<Object>} Conversation history
   */
  getConversationHistory: async (sessionId, limit = 50) => {
    try {
      const response = await aiAxiosClient.get(`/sessions/${sessionId}/history`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error("Get conversation history failed:", error);
      throw error;
    }
  },

  /**
   * Clear conversation history for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Clear result
   */
  clearConversation: async (sessionId) => {
    try {
      const response = await aiAxiosClient.delete(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error("Clear conversation failed:", error);
      throw error;
    }
  },

  /**
   * Search for products
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Search results
   */
  searchProducts: async (query, filters = {}) => {
    try {
      const params = {
        q: query,
        ...filters
      };

      // Gợi ý: có thể map sang /chat/user với query nếu chưa có search API riêng
      const response = await aiAxiosClient.get("/products/search", { params });
      return response.data;
    } catch (error) {
      console.error("Search products failed:", error);
      throw error;
    }
  },

  /**
   * Get system statistics
   * @returns {Promise<Object>} System stats
   */
  getSystemStats: async () => {
    try {
      const response = await aiAxiosClient.get("/health");
      return response.data;
    } catch (error) {
      console.error("Get system stats failed:", error);
      throw error;
    }
  },

  /**
   * Generate report với SSE progress tracking
   * @param {Object} params - Report generation parameters
   * @param {Function} onProgress - Callback for progress events
   * @returns {Promise<Object>} Final report info
   */
  generateReport: async (params, onProgress) => {
    try {
      const response = await fetch(`${AI_API_URL}/api/ai/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (onProgress) {
                onProgress(event);
              }
            } catch (e) {
              console.error("Error parsing SSE event:", e);
            }
          }
        }
      }

      // Return final result (last event)
      return { success: true };
    } catch (error) {
      console.error("Generate report failed:", error);
      throw error;
    }
  },

  /**
   * Get report by ID
   */
  getReport: async (reportId) => {
    try {
      const response = await aiAxiosClient.get(`/api/ai/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error("Get report failed:", error);
      throw error;
    }
  },

  /**
   * Download report as file
   */
  downloadReport: async (reportId) => {
    try {
      const response = await aiAxiosClient.get(`/api/ai/reports/${reportId}/download`, {
        responseType: "blob",
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report_${reportId}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error("Download report failed:", error);
      throw error;
    }
  },

  /**
   * List all reports
   */
  listReports: async (reportType = null, limit = 50) => {
    try {
      const params = { limit };
      if (reportType) params.report_type = reportType;
      
      const response = await aiAxiosClient.get("/api/ai/reports", { params });
      return response.data;
    } catch (error) {
      console.error("List reports failed:", error);
      throw error;
    }
  },

  /**
   * Ask Legal Advisor - Tư vấn luật & Tính thuế
   * @param {string} query - Legal question or tax calculation query
   * @param {number} region - Region code (1-4) for minimum wage calculation
   * @returns {Promise<Object>} Legal consultation response
   */
  askLegalAdvisor: async (query, region = 1) => {
    try {
      const response = await aiAxiosClient.post("/api/legal/chat", {
        query: query.trim(),
        region: region
      });
      
      return {
        success: response.data.success !== false,
        response: response.data.response || "Xin lỗi, không thể xử lý yêu cầu.",
        query_type: response.data.query_type || "legal",
        timestamp: new Date().toISOString(),
        metadata: {
          model: "legal_assistant",
          query_type: response.data.query_type
        }
      };
    } catch (error) {
      console.error("Ask legal advisor failed:", error);
      
      if (error.response?.data) {
        return {
          success: false,
          response: error.response.data.error || "Xin lỗi, có lỗi xảy ra khi tư vấn luật.",
          query_type: "error",
          timestamp: new Date().toISOString(),
          metadata: {
            error: true,
            error_message: error.response.data.error || error.message
          }
        };
      }
      
      throw error;
    }
  },

  /**
   * Calculate Tax - Tính thuế trực tiếp
   * @param {number} grossSalary - Gross salary in VND
   * @param {number} dependents - Number of dependents
   * @param {number} region - Region code (1-4)
   * @returns {Promise<Object>} Tax calculation result
   */
  calculateTax: async (grossSalary, dependents = 0, region = 1) => {
    try {
      const response = await aiAxiosClient.post("/api/legal/calculate-tax", {
        query: `Lương ${grossSalary / 1000000} triệu, ${dependents} con`,
        region: region
      });
      
      return {
        success: response.data.success !== false,
        result: response.data.result || null,
        formatted: response.data.formatted || response.data.result,
        timestamp: new Date().toISOString(),
        metadata: {
          model: "tax_calculator",
          gross_salary: grossSalary,
          dependents: dependents,
          region: region
        }
      };
    } catch (error) {
      console.error("Calculate tax failed:", error);
      
      if (error.response?.data) {
        return {
          success: false,
          formatted: error.response.data.error || "Xin lỗi, có lỗi xảy ra khi tính thuế.",
          timestamp: new Date().toISOString(),
          metadata: {
            error: true,
            error_message: error.response.data.error || error.message
          }
        };
      }
      
      throw error;
    }
  },

  /**
   * Get Business Report - Lấy báo cáo phân tích kinh doanh
   * @param {string} reportType - Report type: daily, monthly, weekly
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Business report data
   */
  getBusinessReport: async (reportType = "daily", month = null, year = null, startDate = null, endDate = null) => {
    try {
      const params = { type: reportType };
      if (month) params.month = month;
      if (year) params.year = year;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await aiAxiosClient.get("/api/analyst/report", { params });
      
      return {
        success: response.data.success !== false,
        report_type: reportType,
        data: response.data.data || {},
        agent_response: response.data.agent_response || "",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Get business report failed:", error);
      throw error;
    }
  },

  /**
   * Get Revenue Analytics - Phân tích doanh thu
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Revenue analytics data
   */
  getRevenueAnalytics: async (month = null, year = null, startDate = null, endDate = null) => {
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await aiAxiosClient.get("/api/analyst/revenue", { params });
      
      return {
        success: response.data.success !== false,
        data: response.data.data || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Get revenue analytics failed:", error);
      throw error;
    }
  }
};

/**
 * WebSocket client for real-time communication
 * Provides streaming responses and real-time updates
 */
export class AIWebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  /**
   * Connect to WebSocket
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  connect(sessionId) {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${AI_WS_URL}?session_id=${sessionId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("✅ WebSocket connected");
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error("WebSocket message parse error:", error);
          }
        };

        this.ws.onclose = () => {
          // Suppress WebSocket disconnect logs - backend doesn't support WebSocket
          // Only attempt reconnect if explicitly enabled
          if (process.env.REACT_APP_ENABLE_WEBSOCKET === 'true') {
            this.handleReconnect(sessionId);
          }
        };

        this.ws.onerror = (error) => {
          // Suppress WebSocket errors - backend doesn't support WebSocket currently
          // Only log if in development mode
          if (process.env.NODE_ENV === 'development') {
            console.warn("WebSocket not supported by backend (using HTTP fallback)");
          }
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message via WebSocket
   * @param {string} message - Message to send
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "message",
        content: message
      }));
    } else {
      console.warn("WebSocket not connected");
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} data - Message data
   */
  handleMessage(data) {
    const listeners = this.listeners.get(data.type) || [];
    listeners.forEach(callback => callback(data));
  }

  /**
   * Add event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  removeEventListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const listeners = this.listeners.get(eventType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Handle reconnection logic
   * @param {string} sessionId - Session ID
   */
  handleReconnect(sessionId) {
    // Only reconnect if WebSocket is explicitly enabled
    if (process.env.REACT_APP_ENABLE_WEBSOCKET !== 'true') {
      return; // Skip reconnection - WebSocket not supported
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      }
      
      setTimeout(() => {
        this.connect(sessionId).catch(() => {
          // Suppress error - WebSocket not supported
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Max reconnection attempts reached (WebSocket not supported by backend)");
      }
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Utility functions for AI chatbot
 */
export const aiUtils = {
  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId: () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Format response time
   * @param {number} time - Response time in seconds
   * @returns {string} Formatted time
   */
  formatResponseTime: (time) => {
    if (time < 1) {
      return `${Math.round(time * 1000)}ms`;
    } else {
      return `${time.toFixed(2)}s`;
    }
  },

  /**
   * Check if AI service is available
   * @returns {Promise<boolean>} Service availability
   */
  isServiceAvailable: async () => {
    try {
      await aiChatbotAPI.healthCheck();
      return true;
    } catch (error) {
      // Service not available - this is expected and acceptable
      // Don't log as error since it's optional functionality
      return false;
    }
  },

  /**
   * Get error message from API error
   * @param {Error} error - API error
   * @returns {string} User-friendly error message
   */
  getErrorMessage: (error) => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    } else if (error.code === 'ECONNREFUSED') {
      return "Không thể kết nối đến AI service. Vui lòng kiểm tra lại.";
    } else if (error.message) {
      return error.message;
    } else {
      return "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.";
    }
  }
};

// Export default API client
export default aiChatbotAPI;
