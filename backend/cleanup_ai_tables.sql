-- Script để xóa các bảng AI khỏi MySQL database
-- Chạy script này để dọn dẹp các bảng AI

-- Liệt kê tất cả bảng có prefix 'ai_'
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ecommerce_db' 
AND TABLE_NAME LIKE 'ai_%';

-- Xóa các bảng AI (uncomment để thực thi)
-- DROP TABLE IF EXISTS ai_analytics;
-- DROP TABLE IF EXISTS ai_market_analysis;
-- DROP TABLE IF EXISTS ai_model_performance;
-- DROP TABLE IF EXISTS ai_model_training_jobs;
-- DROP TABLE IF EXISTS ai_prediction_cache;
-- DROP TABLE IF EXISTS ai_recommendation_training_data;
-- DROP TABLE IF EXISTS ai_revenue_training_data;
-- DROP TABLE IF EXISTS ai_sentiment_training_data;
-- DROP TABLE IF EXISTS ai_user_interactions;
