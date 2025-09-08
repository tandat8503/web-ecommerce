CREATE TABLE `admin_users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255) UNIQUE NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `role` enum(admin,staff) DEFAULT 'staff',
  `is_active` boolean DEFAULT true,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255) UNIQUE NOT NULL,
  `password` varchar(255),
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(20) UNIQUE,
  `avatar` varchar(500),
  `avatar_public_id` varchar(255),
  `google_id` varchar(255) UNIQUE,
  `is_active` boolean DEFAULT true,
  `is_verified` boolean DEFAULT false,
  `email_verified_at` datetime,
  `phone_verified_at` datetime,
  `last_login_at` datetime,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `otp_verifications` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `email` varchar(255),
  `phone` varchar(20),
  `otp_code` varchar(6) NOT NULL,
  `type` enum(email_verification,phone_verification,password_reset,login_verification) NOT NULL,
  `is_used` boolean DEFAULT false,
  `expires_at` datetime NOT NULL,
  `attempts` int DEFAULT 0,
  `max_attempts` int DEFAULT 3,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `password_resets` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `token` varchar(255) UNIQUE NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` boolean DEFAULT false,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `addresses` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `street_address` varchar(255) NOT NULL,
  `ward` varchar(100) NOT NULL,
  `district` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `postal_code` varchar(20),
  `address_type` enum(home,office) DEFAULT 'home',
  `is_default` boolean DEFAULT false,
  `note` text,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `categories` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) UNIQUE NOT NULL,
  `description` text,
  `image_url` varchar(500),
  `is_active` boolean DEFAULT true,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `brands` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `logo_url` varchar(500),
  `is_active` boolean DEFAULT true,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `products` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `sku` varchar(100) UNIQUE NOT NULL,
  `name` varchar(300) NOT NULL,
  `slug` varchar(300) UNIQUE NOT NULL,
  `description` text,
  `category_id` int,
  `brand_id` int,
  `status` enum(active,inactive,out_of_stock) DEFAULT 'active',
  `is_featured` boolean DEFAULT false,
  `price` decimal(12,2) NOT NULL,
  `sale_price` decimal(12,2),
  `stock_quantity` int DEFAULT 0,
  `weight` decimal(8,2),
  `dimensions` varchar(100),
  `view_count` int DEFAULT 0,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `product_images` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `product_id` int,
  `image_url` varchar(500) NOT NULL,
  `image_public_id` varchar(255),
  `is_primary` boolean DEFAULT false,
  `sort_order` int DEFAULT 0,
  `created_at` datetime
);

CREATE TABLE `product_variants` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `product_id` int,
  `sku` varchar(100) UNIQUE NOT NULL,
  `name` varchar(200) NOT NULL,
  `price` decimal(12,2),
  `stock_quantity` int DEFAULT 0,
  `weight` decimal(8,2),
  `image_url` varchar(500),
  `is_active` boolean DEFAULT true,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `variant_attributes` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `type` enum(color,size,capacity,power,material,voltage,weight,dimensions,warranty,energy_class,functions,usage,safety_features) NOT NULL,
  `sort_order` int DEFAULT 0,
  `is_filterable` boolean DEFAULT true,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `variant_attribute_values` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `variant_id` int,
  `attribute_id` int,
  `value` varchar(255) NOT NULL,
  `display_value` varchar(255) NOT NULL,
  `color_code` varchar(7),
  `created_at` datetime
);

CREATE TABLE `shopping_cart` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `product_id` int,
  `variant_id` int,
  `quantity` int NOT NULL DEFAULT 1,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `wishlist` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `product_id` int,
  `created_at` datetime
);

CREATE TABLE `product_reviews` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `product_id` int,
  `user_id` int,
  `order_id` int,
  `rating` int NOT NULL,
  `comment` text,
  `is_approved` boolean DEFAULT true,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `orders` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_number` varchar(50) UNIQUE NOT NULL,
  `user_id` int,
  `status` enum(pending,confirmed,processing,shipped,delivered,cancelled) DEFAULT 'pending',
  `payment_status` enum(pending,paid,failed) DEFAULT 'pending',
  `subtotal` decimal(12,2) NOT NULL,
  `shipping_fee` decimal(12,2) DEFAULT 0,
  `discount_amount` decimal(12,2) DEFAULT 0,
  `total_amount` decimal(12,2) NOT NULL,
  `shipping_address` json NOT NULL,
  `payment_method` enum(COD,MOMO,VNPAY) NOT NULL,
  `payment_reference` varchar(200),
  `tracking_code` varchar(255),
  `customer_note` text,
  `admin_note` text,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `order_items` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int,
  `product_id` int,
  `variant_id` int,
  `product_name` varchar(300) NOT NULL,
  `product_sku` varchar(100) NOT NULL,
  `variant_name` varchar(200),
  `quantity` int NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `total_price` decimal(12,2) NOT NULL,
  `created_at` datetime
);

CREATE TABLE `coupons` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(50) UNIQUE NOT NULL,
  `name` varchar(200) NOT NULL,
  `discount_type` enum(percent,amount) NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `minimum_amount` decimal(12,2) DEFAULT 0,
  `usage_limit` int DEFAULT 100,
  `used_count` int DEFAULT 0,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `is_active` boolean DEFAULT true,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `coupon_usage` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `coupon_id` int,
  `user_id` int,
  `order_id` int,
  `used_at` datetime DEFAULT (now())
);

CREATE TABLE `payments` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int,
  `payment_method` enum(COD,MOMO,VNPAY) NOT NULL,
  `payment_status` enum(pending,paid,failed) DEFAULT 'pending',
  `amount` decimal(12,2) NOT NULL,
  `transaction_id` varchar(255) UNIQUE NOT NULL,
  `paid_at` datetime,
  `created_at` datetime
);

CREATE TABLE `banners` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `banner_public_id` varchar(255),
  `link_url` varchar(500),
  `is_active` boolean DEFAULT true,
  `sort_order` int DEFAULT 0,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `notifications` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `is_read` boolean DEFAULT false,
  `created_at` datetime
);

CREATE TABLE `settings` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `key_name` varchar(100) UNIQUE NOT NULL,
  `value` text,
  `description` text,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE TABLE `login_history` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `login_method` enum(email_password,google,phone_otp) NOT NULL,
  `ip_address` varchar(45),
  `user_agent` text,
  `is_successful` boolean DEFAULT true,
  `failure_reason` varchar(200),
  `created_at` datetime
);

CREATE TABLE `user_sessions` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `session_token` varchar(255) UNIQUE NOT NULL,
  `refresh_token` varchar(255) UNIQUE,
  `device_info` varchar(200),
  `ip_address` varchar(45),
  `is_active` boolean DEFAULT true,
  `expires_at` datetime NOT NULL,
  `created_at` datetime,
  `updated_at` datetime
);

CREATE INDEX `otp_verifications_index_0` ON `otp_verifications` (`email`, `type`, `is_used`);

CREATE INDEX `otp_verifications_index_1` ON `otp_verifications` (`phone`, `type`, `is_used`);

CREATE INDEX `otp_verifications_index_2` ON `otp_verifications` (`otp_code`, `type`);

CREATE UNIQUE INDEX `variant_attribute_values_index_3` ON `variant_attribute_values` (`variant_id`, `attribute_id`);

CREATE UNIQUE INDEX `shopping_cart_index_4` ON `shopping_cart` (`user_id`, `product_id`, `variant_id`);

CREATE UNIQUE INDEX `wishlist_index_5` ON `wishlist` (`user_id`, `product_id`);

CREATE UNIQUE INDEX `product_reviews_index_6` ON `product_reviews` (`product_id`, `user_id`);

CREATE INDEX `login_history_index_7` ON `login_history` (`user_id`, `created_at`);

CREATE INDEX `user_sessions_index_8` ON `user_sessions` (`user_id`, `is_active`);

CREATE INDEX `user_sessions_index_9` ON `user_sessions` (`session_token`);

ALTER TABLE `otp_verifications` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `password_resets` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `addresses` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `products` ADD FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `products` ADD FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`);

ALTER TABLE `product_images` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `product_variants` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `variant_attribute_values` ADD FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`);

ALTER TABLE `variant_attribute_values` ADD FOREIGN KEY (`attribute_id`) REFERENCES `variant_attributes` (`id`);

ALTER TABLE `shopping_cart` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `shopping_cart` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `shopping_cart` ADD FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`);

ALTER TABLE `wishlist` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `wishlist` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `product_reviews` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `product_reviews` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `product_reviews` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `orders` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `order_items` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `order_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `order_items` ADD FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`);

ALTER TABLE `coupon_usage` ADD FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`);

ALTER TABLE `coupon_usage` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `coupon_usage` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `payments` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `notifications` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `login_history` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `user_sessions` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
