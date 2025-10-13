// Unified AI API client
import axios from "axios";

// AI System API URL
const AI_API_URL = "http://localhost:5002/api";

const aiAxiosClient = axios.create({
  baseURL: AI_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Interceptor để xử lý response lỗi
aiAxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("AI API Error:", error);
    return Promise.reject(error);
  }
);

// Unified AI API functions
export const aiAPI = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await aiAxiosClient.get("/ai/health");
      return response.data;
    } catch (error) {
      console.error("Error checking health:", error);
      throw error;
    }
  },

  // Chat functionality
  sendMessage: async (message, sessionId = null) => {
    try {
      const payload = { message };
      if (sessionId) {
        payload.session_id = sessionId;
      }
      const response = await aiAxiosClient.post("/ai/chat", payload);
      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  // Session management
  getSessionHistory: async (sessionId) => {
    try {
      const response = await aiAxiosClient.get(`/ai/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error("Error getting session history:", error);
      throw error;
    }
  },

  // Analytics
  getAnalytics: async () => {
    try {
      const response = await aiAxiosClient.get("/ai/analytics");
      return response.data;
    } catch (error) {
      console.error("Error getting analytics:", error);
      throw error;
    }
  },

  // Product management
  getProducts: async (limit = 10) => {
    try {
      const response = await aiAxiosClient.get(`/ai/products?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error getting products:", error);
      throw error;
    }
  },

  searchProducts: async (query) => {
    try {
      const response = await aiAxiosClient.post("/ai/search", { query });
      return response.data;
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  },

  // Sentiment analysis
  analyzeSentiment: async (text) => {
    try {
      const response = await aiAxiosClient.post("/ai/sentiment", { text });
      return response.data;
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      throw error;
    }
  },
};

// Backward compatibility
export const chatbotAPI = aiAPI;

export default aiAxiosClient;
