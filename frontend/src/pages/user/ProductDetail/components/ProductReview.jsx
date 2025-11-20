import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { getProductReviews } from "@/api/productReview";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { RatingStars } from "@/components/user/RatingStars";

const ProductReview = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
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


  // Render single review (chỉ hiển thị, không cho edit/delete)
  const ReviewItem = ({ review }) => {
    const fullName = `${review.user.firstName} ${review.user.lastName}`;
    const timeAgo = formatDistanceToNow(new Date(review.createdAt), { 
      addSuffix: true, 
      locale: vi 
    });

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

        {/* Info message - chỉ hiển thị đánh giá, không cho viết */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg text-center border border-blue-200">
          <p className="text-sm text-gray-700">
            Để đánh giá sản phẩm, vui lòng vào trang <strong>Đơn mua</strong> và chọn đơn hàng đã giao thành công
          </p>
        </div>

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

