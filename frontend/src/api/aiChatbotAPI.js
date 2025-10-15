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
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
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
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("❌ API Response Error:", error);
    
    // Handle specific error cases
    if (error.response?.status === 500) {
      console.error("Server error - AI service may be down");
    } else if (error.code === 'ECONNREFUSED') {
      console.error("Connection refused - AI service not running");
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
      console.error("Health check failed:", error);
      throw error;
    }
  },

  /**
   * Send a message to the chatbot
   * @param {string} message - User message
   * @param {string} sessionId - Optional session ID
   * @param {boolean} stream - Whether to stream response
   * @returns {Promise<Object>} Bot response
   */
  // User chatbot: tư vấn sản phẩm
  sendUserMessage: async (message, sessionId = null) => {
    try {
      const payload = { role: "user", message: message.trim() };
      const response = await aiAxiosClient.post("/chat/user", payload);
      return response.data;
    } catch (error) {
      console.error("Send user message failed:", error);
      throw error;
    }
  },

  // Admin chatbot: intent nghiệp vụ (doanh thu/sentiment/report)
  sendAdminMessage: async (message) => {
    try {
      const payload = { role: "admin", message: message.trim() };
      const response = await aiAxiosClient.post("/chat/admin", payload);
      return response.data;
    } catch (error) {
      console.error("Send admin message failed:", error);
      throw error;
    }
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
          console.log("WebSocket disconnected");
          this.handleReconnect(sessionId);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
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
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      
      setTimeout(() => {
        this.connect(sessionId).catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
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
