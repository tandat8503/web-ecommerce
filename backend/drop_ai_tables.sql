-- Script để xóa các bảng AI khỏi MySQL database
-- WARNING: Script này sẽ xóa vĩnh viễn các bảng AI

-- Xóa các bảng AI
DROP TABLE IF EXISTS ai_analytics;
DROP TABLE IF EXISTS ai_market_analysis;
DROP TABLE IF EXISTS ai_model_performance;
DROP TABLE IF EXISTS ai_model_training_jobs;
DROP TABLE IF EXISTS ai_prediction_cache;
DROP TABLE IF EXISTS ai_recommendation_training_data;
DROP TABLE IF EXISTS ai_revenue_training_data;
DROP TABLE IF EXISTS ai_sentiment_training_data;
DROP TABLE IF EXISTS ai_user_interactions;

-- Xóa các bảng AI khác có thể có
DROP TABLE IF EXISTS ai_chatbot_training_data;
DROP TABLE IF EXISTS ai_conversation_logs;
DROP TABLE IF EXISTS ai_training_data;
DROP TABLE IF EXISTS ai_reports;
DROP TABLE IF EXISTS ai_models;
DROP TABLE IF EXISTS ai_sessions;
DROP TABLE IF EXISTS ai_logs;
