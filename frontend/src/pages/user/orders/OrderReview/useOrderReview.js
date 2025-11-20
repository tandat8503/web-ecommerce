import { useEffect, useState, useCallback } from "react";
import { getOrderById } from "@/api/orders";
import { getMyReviews } from "@/api/productReview";

/**
 * Hook để quản lý order review page
 * - Load order details
 * - Load reviews đã có của user cho các sản phẩm trong order
 * - Map reviews với products để biết sản phẩm nào đã review, chưa review
 */
export const useOrderReview = (orderId) => {
  const [order, setOrder] = useState(null);
  const [reviews, setReviews] = useState([]); // Reviews đã có của user
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Load order details
  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getOrderById(orderId);
      if (!data.order) {
        setOrder(null);
        return;
      }

      let parsedAddress = data.order.shippingAddress;
      if (parsedAddress && typeof parsedAddress === "string") {
        try {
          parsedAddress = JSON.parse(parsedAddress);
        } catch {
          parsedAddress = null;
        }
      }

      setOrder({
        ...data.order,
        shippingAddress: parsedAddress || data.order.shippingAddress || {}
      });
    } catch (error) {
      console.error("❌ Error fetching order:", error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Load reviews của user cho các sản phẩm trong order
  const fetchReviews = useCallback(async () => {
    if (!order || !order.orderItems || order.orderItems.length === 0) {
      return;
    }

    try {
      setReviewsLoading(true);
      const productIds = order.orderItems.map(item => item.productId);
      
      // Fetch reviews cho tất cả sản phẩm trong order
      const allReviews = [];
      for (const productId of productIds) {
        try {
          const response = await getMyReviews({ productId, limit: 100 });
          const data = response.data?.data || response.data || response;
          const productReviews = Array.isArray(data.reviews) ? data.reviews : (Array.isArray(data) ? data : []);
          allReviews.push(...productReviews);
        } catch (error) {
          console.error(`❌ Error fetching reviews for product ${productId}:`, error);
        }
      }
      
      setReviews(allReviews);
    } catch (error) {
      console.error("❌ Error fetching reviews:", error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [order]);

  // Load order khi component mount
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Load reviews khi order đã load xong
  useEffect(() => {
    if (order && order.status === 'DELIVERED') {
      fetchReviews();
    }
  }, [order, fetchReviews]);

  // Helper: Check xem sản phẩm đã được review chưa
  const getReviewForProduct = (productId) => {
    return reviews.find(r => r.productId === productId);
  };

  // Helper: Check xem có sản phẩm nào chưa review không
  const hasUnreviewedProducts = () => {
    if (!order || !order.orderItems) return false;
    return order.orderItems.some(item => !getReviewForProduct(item.productId));
  };

  // Helper: Đếm số sản phẩm đã review
  const getReviewedCount = () => {
    if (!order || !order.orderItems) return 0;
    return order.orderItems.filter(item => getReviewForProduct(item.productId)).length;
  };

  return {
    order,
    reviews,
    loading,
    reviewsLoading,
    fetchOrder,
    fetchReviews,
    getReviewForProduct,
    hasUnreviewedProducts,
    getReviewedCount,
  };
};

