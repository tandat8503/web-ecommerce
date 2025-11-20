import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, List, Skeleton, Tag, Space } from "antd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RatingSelector, RatingStars } from "@/components/user/RatingStars";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { formatPrice } from "@/lib/utils";
import { useOrderReview } from "./useOrderReview";
import { createReview, updateMyReview } from "@/api/productReview";
import { toast } from "react-toastify";
import { CheckCircle2, Star, ArrowLeft } from "lucide-react";
import { getStatusLabel, getStatusTagColor } from "../OrderDetail/useOrderDetail";

export default function OrderReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    order,
    reviews,
    loading,
    reviewsLoading,
    fetchOrder,
    fetchReviews,
    getReviewForProduct,
    hasUnreviewedProducts,
    getReviewedCount,
  } = useOrderReview(id);

  // State cho form review của từng sản phẩm
  const [activeForm, setActiveForm] = useState(null); // productId đang mở form
  const [formData, setFormData] = useState({}); // { productId: { rating, title, comment } }
  const [submitting, setSubmitting] = useState(false);

  // Initialize form data khi mở form
  const handleOpenForm = (productId, existingReview = null) => {
    setActiveForm(productId);
    if (existingReview) {
      setFormData(prev => ({
        ...prev,
        [productId]: {
          rating: existingReview.rating,
          title: existingReview.title || "",
          comment: existingReview.comment || "",
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [productId]: {
          rating: 0,
          title: "",
          comment: "",
        }
      }));
    }
  };

  const handleCloseForm = (productId) => {
    setActiveForm(null);
    setFormData(prev => {
      const newData = { ...prev };
      delete newData[productId];
      return newData;
    });
  };

  // Submit review
  const handleSubmitReview = async (productId, isUpdate = false) => {
    const data = formData[productId];
    if (!data || data.rating === 0) {
      toast.warning("Vui lòng chọn số sao đánh giá");
      return;
    }

    try {
      setSubmitting(true);
      
      if (isUpdate) {
        const review = getReviewForProduct(productId);
        if (review) {
          await updateMyReview(review.id, {
            rating: data.rating,
            title: data.title.trim() || null,
            comment: data.comment.trim() || null,
          });
          toast.success("Cập nhật đánh giá thành công!");
        }
      } else {
        await createReview({
          productId: Number(productId),
          rating: data.rating,
          title: data.title.trim() || null,
          comment: data.comment.trim() || null,
          orderId: Number(id),
        });
        toast.success("Đánh giá đã được đăng thành công!");
      }

      // Reload reviews
      await fetchReviews();
      handleCloseForm(productId);
    } catch (error) {
      console.error("❌ Error submitting review:", error);
      toast.error(error.response?.data?.message || "Không thể gửi đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  // Update form data
  const updateFormData = (productId, field, value) => {
    setFormData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      }
    }));
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BreadcrumbNav />
        <div className="max-w-5xl mx-auto mt-6">
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </div>
      </div>
    );
  }

  // Chỉ cho phép review khi order status = DELIVERED
  if (order.status !== 'DELIVERED') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <BreadcrumbNav />
        <div className="max-w-5xl mx-auto mt-6">
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công.
              </p>
              <Tag color={getStatusTagColor(order.status)}>
                {getStatusLabel(order.status)}
              </Tag>
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate(`/orders/${id}`)}>
                  <ArrowLeft className="mr-2" size={16} />
                  Quay lại chi tiết đơn hàng
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const totalProducts = order.orderItems?.length || 0;
  const reviewedCount = getReviewedCount();
  const unreviewedCount = totalProducts - reviewedCount;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />
      <div className="max-w-5xl mx-auto mt-6">
        <Card>
          <Space direction="vertical" size="large" className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">Đánh giá sản phẩm</h2>
                <p className="text-sm text-gray-600">
                  Mã đơn hàng: <span className="font-semibold">{order.orderNumber}</span>
                </p>
              </div>
              <div className="text-right">
                <Tag color="green">Đã giao</Tag>
                <div className="text-sm text-gray-600 mt-1">
                  {reviewedCount}/{totalProducts} sản phẩm đã đánh giá
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {totalProducts > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Tiến độ đánh giá</span>
                  <span className="text-sm text-gray-600">
                    {reviewedCount}/{totalProducts}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(reviewedCount / totalProducts) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Products List */}
            {reviewsLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <List
                dataSource={order.orderItems || []}
                renderItem={(item) => {
                  const productId = item.productId;
                  const existingReview = getReviewForProduct(productId);
                  const isFormOpen = activeForm === productId;
                  const productFormData = formData[productId] || { rating: 0, title: "", comment: "" };

                  return (
                    <List.Item className="!px-0">
                      <div className="w-full">
                        {/* Product Info */}
                        <div className="flex gap-4 mb-4">
                          <img
                            src={item.product?.primaryImage || item.product?.imageUrl || "/placeholder-product.jpg"}
                            alt={item.productName}
                            className="h-24 w-24 rounded border object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{item.productName}</h3>
                            {item.variantName && (
                              <p className="text-sm text-gray-500 mb-2">{item.variantName}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Số lượng: {item.quantity}</span>
                              <span className="font-semibold text-red-600">
                                {formatPrice(Number(item.totalPrice))}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            {existingReview ? (
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 size={16} className="text-green-600" />
                                  <span className="text-sm text-green-600 font-medium">Đã đánh giá</span>
                                </div>
                                <RatingStars rating={existingReview.rating} size={18} />
                              </div>
                            ) : (
                              <Tag color="orange">Chưa đánh giá</Tag>
                            )}
                          </div>
                        </div>

                        {/* Review Form */}
                        {isFormOpen && (
                          <div className="ml-28 p-4 bg-gray-50 rounded-lg border mb-4">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmitReview(productId, !!existingReview);
                              }}
                            >
                              <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">
                                  Đánh giá của bạn <span className="text-red-500">*</span>
                                </label>
                                <RatingSelector
                                  value={productFormData.rating}
                                  onChange={(rating) => updateFormData(productId, "rating", rating)}
                                  disabled={submitting}
                                />
                              </div>

                              <div className="mb-4">
                                <Input
                                  value={productFormData.title}
                                  onChange={(e) => updateFormData(productId, "title", e.target.value)}
                                  placeholder="Tiêu đề đánh giá (tùy chọn)"
                                  disabled={submitting}
                                />
                              </div>

                              <div className="mb-4">
                                <Textarea
                                  value={productFormData.comment}
                                  onChange={(e) => updateFormData(productId, "comment", e.target.value)}
                                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                                  rows={4}
                                  disabled={submitting}
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  disabled={productFormData.rating === 0 || submitting}
                                >
                                  {existingReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleCloseForm(productId)}
                                  disabled={submitting}
                                >
                                  Hủy
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {!isFormOpen && (
                          <div className="ml-28 flex gap-2">
                            {existingReview ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenForm(productId, existingReview)}
                                >
                                  <Star className="mr-2" size={14} />
                                  Sửa đánh giá
                                </Button>
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                  <span>Đã đánh giá:</span>
                                  <RatingStars rating={existingReview.rating} size={16} />
                                  {existingReview.title && (
                                    <span className="font-medium">"{existingReview.title}"</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenForm(productId)}
                              >
                                <Star className="mr-2" size={14} />
                                Viết đánh giá
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate(`/orders/${id}`)}
              >
                <ArrowLeft className="mr-2" size={16} />
                Quay lại chi tiết đơn hàng
              </Button>
              {unreviewedCount > 0 && (
                <div className="text-sm text-gray-600">
                  Còn {unreviewedCount} sản phẩm chưa đánh giá
                </div>
              )}
              {unreviewedCount === 0 && reviewedCount > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">Đã đánh giá tất cả sản phẩm</span>
                </div>
              )}
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}

