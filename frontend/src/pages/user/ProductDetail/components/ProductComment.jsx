import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Reply, Edit, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { getProductComments, createComment, deleteMyComment } from "@/api/productComment";
import { useAuth } from "@/hooks/useAuth"; // Hook lấy user info
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const ProductComments = ({ productId }) => {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { commentId, userName }
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Debug log when replyTo changes
  useEffect(() => {
    console.log("🎯 replyTo state changed:", replyTo);
  }, [replyTo]);

  // Fetch comments
  const fetchComments = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getProductComments(productId, {
        page,
        limit: 10
      });
      
      // Handle response structure (nested data)
      console.log("📥 RAW response:", response); // Debug log
      
      const data = response.data?.data || response.data || response;
      console.log("📦 Parsed data:", data); // Debug log
      console.log("🔍 Fetch params:", { productId, page, limit: 10 });
      
      const fetchedComments = data.comments || [];
      console.log("📊 Total comments:", fetchedComments.length); // Debug log
      console.log("📋 Comments array:", fetchedComments);
      
      setComments(fetchedComments);
      setPagination({
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 1
      });
    } catch (error) {
      console.error("❌ Error fetching comments:", error);
      toast.error("Không thể tải bình luận");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchComments(currentPage);
    }
  }, [productId, currentPage]);

  // Submit comment
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.warning("Vui lòng đăng nhập để bình luận");
      return;
    }

    if (!newComment.trim() || newComment.trim().length < 3) {
      toast.warning("Nội dung bình luận phải có ít nhất 3 ký tự");
      return;
    }

    try {
      const response = await createComment({
        productId: Number(productId),
        content: newComment.trim(),
        parentId: replyTo?.commentId || null
      });
      
      console.log("✅ Comment created:", response.data); // Debug log
      console.log("📍 Created comment details:", {
        id: response.data?.data?.id,
        productId: response.data?.data?.productId,
        parentId: response.data?.data?.parentId,
        content: response.data?.data?.content,
        isApproved: response.data?.data?.isApproved
      });
      
      toast.success("Bình luận đã được đăng thành công!");
      setNewComment("");
      setReplyTo(null);
      
      // ✅ Reset về trang 1 và reload để thấy comment mới
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      
      // Force reload comments
      await fetchComments(1);
      
      console.log("🔄 Comments reloaded"); // Debug log
    } catch (error) {
      console.error("❌ Error creating comment:", error); // Debug log
      toast.error(error.response?.data?.message || "Không thể gửi bình luận");
    }
  };

  // Render single comment
  const CommentItem = ({ comment, isReply = false }) => {
    const fullName = `${comment.user.firstName} ${comment.user.lastName}`;
    const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { 
      addSuffix: true, 
      locale: vi 
    });

    return (
      <div className={`flex gap-3 ${isReply ? "ml-12 mt-3" : ""}`}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={comment.user.avatar} />
          <AvatarFallback>{fullName[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{fullName}</span>
              <span className="text-xs text-gray-500">{timeAgo}</span>
            </div>
            <p className="text-sm text-gray-700">{comment.content}</p>
          </div>
          
          {/* Reply button */}
          {!isReply && isAuthenticated && (
            <button
              onClick={() => {
                console.log("🔵 Reply button clicked!", { commentId: comment.id, userName: fullName });
                setReplyTo({ commentId: comment.id, userName: fullName });
              }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1 cursor-pointer"
            >
              <Reply size={14} />
              Trả lời
            </button>
          )}
          
          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle />
          Bình luận ({pagination.total})
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          {replyTo && (
            <div className="mb-2 text-sm text-gray-600 flex items-center justify-between bg-blue-50 p-2 rounded">
              <span>Đang trả lời <strong>{replyTo.userName}</strong></span>
              <button 
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-red-500 hover:text-red-700"
              >
                Hủy
              </button>
            </div>
          )}
          
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              isAuthenticated 
                ? "Viết bình luận của bạn..." 
                : "Vui lòng đăng nhập để bình luận"
            }
            disabled={!isAuthenticated}
            className="mb-2"
            rows={3}
          />
          
          <Button 
            type="submit" 
            disabled={!isAuthenticated || !newComment.trim()}
            className="w-full sm:w-auto"
          >
            <Send size={16} className="mr-2" />
            Gửi bình luận
          </Button>
        </form>

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-8">Đang tải bình luận...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
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

export default ProductComments;