import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { 
  getProductReviews, 
  createReview, 
  updateMyReview, 
  deleteMyReview 
} from "@/api/productReview";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { RatingStars, RatingSelector } from "@/components/user/RatingStars";

const ProductReview = ({ productId }) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState({
    rating: 0,
    title: "",
    comment: "",
    orderId: null
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Fetch reviews
  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getProductReviews(productId, {
        page,
        limit: 10
      });
      
      const data = response.data?.data || response.data || response;
      const fetchedReviews = data.reviews || [];
      const fetchedSummary = data.summary || summary;
      
      setReviews(fetchedReviews);
      setSummary(fetchedSummary);
      setPagination({
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 1
      });
    } catch (error) {
      console.error("❌ Error fetching reviews:", error);
      toast.error("Không thể tải đánh giá");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews(currentPage);
    }
  }, [productId, currentPage]);

  // Check if user already reviewed (from fetched reviews)
  const userReview = isAuthenticated && user 
    ? reviews.find(r => r.user.id === user.id) 
    : null;

  // Submit review
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.warning("Vui lòng đăng nhập để đánh giá");
      return;
    }

    if (formData.rating === 0) {
      toast.warning("Vui lòng chọn số sao đánh giá");
      return;
    }

    try {
      if (editingReview) {
        // Update existing review
        await updateMyReview(editingReview.id, {
          rating: formData.rating,
          title: formData.title.trim() || null,
          comment: formData.comment.trim() || null
        });
        toast.success("Cập nhật đánh giá thành công!");
      } else {
        // Create new review
        await createReview({
          productId: Number(productId),
          rating: formData.rating,
          title: formData.title.trim() || null,
          comment: formData.comment.trim() || null,
          orderId: formData.orderId || null
        });
        toast.success("Đánh giá đã được đăng thành công!");
      }
      
      // Reset form
      setFormData({ rating: 0, title: "", comment: "", orderId: null });
      setShowForm(false);
      setEditingReview(null);
      
      // Reload reviews
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      await fetchReviews(1);
    } catch (error) {
      console.error("❌ Error submitting review:", error);
      toast.error(error.response?.data?.message || "Không thể gửi đánh giá");
    }
  };

  // Delete review
  const handleDelete = async (reviewId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đánh giá này?")) {
      return;
    }

    try {
      await deleteMyReview(reviewId);
      toast.success("Xóa đánh giá thành công!");
      await fetchReviews(currentPage);
    } catch (error) {
      console.error("❌ Error deleting review:", error);
      toast.error(error.response?.data?.message || "Không thể xóa đánh giá");
    }
  };

  // Edit review
  const handleEdit = (review) => {
    setEditingReview(review);
    setFormData({
      rating: review.rating,
      title: review.title || "",
      comment: review.comment || "",
      orderId: review.orderId
    });
    setShowForm(true);
  };

  // Cancel edit
  const handleCancel = () => {
    setFormData({ rating: 0, title: "", comment: "", orderId: null });
    setShowForm(false);
    setEditingReview(null);
  };

  // Render single review
  const ReviewItem = ({ review }) => {
    const fullName = `${review.user.firstName} ${review.user.lastName}`;
    const timeAgo = formatDistanceToNow(new Date(review.createdAt), { 
      addSuffix: true, 
      locale: vi 
    });
    const isMyReview = isAuthenticated && user?.id === review.user.id;

    return (
      <div className="flex gap-3 pb-4 border-b last:border-b-0 last:pb-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={review.user.avatar} />
          <AvatarFallback>{fullName[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{fullName}</span>
                {review.isVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={14} />
                    <span>Đã mua hàng</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <RatingStars rating={review.rating} size={16} />
                <span className="text-xs text-gray-500">{timeAgo}</span>
              </div>
            </div>
            
            {isMyReview && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(review)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(review.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
          
          {review.title && (
            <h4 className="font-semibold text-sm mb-1">{review.title}</h4>
          )}
          
          {review.comment && (
            <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="fill-yellow-400 text-yellow-400" />
          Đánh giá sản phẩm
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Summary */}
        {summary.totalReviews > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {summary.averageRating.toFixed(1)}
                </div>
                <RatingStars rating={summary.averageRating} size={20} />
                <div className="text-sm text-gray-600 mt-1">
                  {summary.totalReviews} đánh giá
                </div>
              </div>
              
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.ratingDistribution[star] || 0;
                  const percentage = summary.totalReviews > 0 
                    ? (count / summary.totalReviews) * 100 
                    : 0;
                  
                  return (
                    <div key={star} className="flex items-center gap-2 mb-1">
                      <span className="text-sm w-12">{star} sao</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Review Form */}
        {isAuthenticated && (showForm || !userReview) && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Đánh giá của bạn <span className="text-red-500">*</span>
              </label>
              <RatingSelector
                value={formData.rating}
                onChange={(rating) => setFormData({ ...formData, rating })}
              />
            </div>
            
            <div className="mb-4">
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Tiêu đề đánh giá (tùy chọn)"
                className="mb-2"
              />
            </div>
            
            <div className="mb-4">
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                rows={4}
                className="mb-2"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={formData.rating === 0}
              >
                {editingReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
              </Button>
              {showForm && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleCancel}
                >
                  Hủy
                </Button>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              ⭐ Bạn chỉ có thể đánh giá sau khi đã nhận hàng (đơn hàng ở trạng thái Đã giao)
            </p>
          </form>
        )}

        {!isAuthenticated && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              Vui lòng đăng nhập để đánh giá sản phẩm
            </p>
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-8">Đang tải đánh giá...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Trước
            </Button>
            <span className="flex items-center px-4">
              Trang {currentPage} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Sau
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductReview;

