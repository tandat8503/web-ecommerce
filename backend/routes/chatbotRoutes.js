import express from 'express';
import axios from 'axios';

const router = express.Router();

// AI v2 Service Configuration
const AI_V2_URL = process.env.AI_V2_URL || 'http://localhost:8000';
const AI_V2_TIMEOUT = 60000; // 60 seconds

// Create axios instance for AI v2
const aiV2Client = axios.create({
    baseURL: AI_V2_URL,
    timeout: AI_V2_TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * POST /api/chatbot/chat
 * Unified chatbot endpoint - routes to AI v2
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, session_id, history, role, image_data } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Build request payload
        const payload = {
            message: message.trim(),
            session_id: session_id || null,
            history: history || '',
            role: role || 'user'
        };

        // Add image_data if provided (for image-based search)
        if (image_data) {
            payload.image_data = image_data;
            console.log('[Chatbot] Image-based search request');
        }

        // Forward request to AI v2
        const response = await aiV2Client.post('/api/v2/chat', payload);

        // Return standardized response
        res.json({
            success: true,
            ...response.data
        });

    } catch (error) {
        console.error('Chatbot error:', error.message);

        // Handle AI service errors
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data.detail || error.response.data.error || 'AI service error',
                details: error.response.data
            });
        }

        // Handle connection errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({
                success: false,
                error: 'AI service is currently unavailable. Please try again later.'
            });
        }

        // Generic error
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chatbot/health
 * Health check for AI service
 */
router.get('/health', async (req, res) => {
    try {
        const response = await aiV2Client.get('/health');
        res.json({
            success: true,
            ai_service: 'available',
            ...response.data
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            ai_service: 'unavailable',
            error: error.message
        });
    }
});

export default router;
