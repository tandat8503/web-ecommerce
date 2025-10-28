import { create } from 'zustand'
import { 
  getWishlist, 
  addToWishlist as addToWishlistAPI, 
  removeFromWishlist as removeFromWishlistAPI,
  toggleWishlist as toggleWishlistAPI,
  clearWishlist as clearWishlistAPI
} from '@/api/wishlist'
import { toast } from 'react-toastify'

/**
 * 🎯 WISHLIST STORE - Quản lý danh sách yêu thích

 */

const useWishlistStore = create((set, get) => ({
  // ========================================
  // 🏗️ STATE - Trạng thái
  // ========================================
  items: [],                    // Danh sách sản phẩm yêu thích
  wishlistProductIds: [],       // Array ID sản phẩm (để check nhanh)
  loading: false,               // Trạng thái loading
  error: null,                  // Lỗi nếu có

  // ========================================
  // 🚀 ACTIONS - Hành động
  // ========================================

  /**
   * 📥 fetchWishlist - Lấy danh sách yêu thích
   */
  fetchWishlist: async () => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        set({ items: [], wishlistProductIds: [], loading: false })
        return
      }

      const response = await getWishlist()
      const items = response.data.wishlist || []
      const wishlistProductIds = items.map(item => item.productId)
      
      set({ 
        items, 
        wishlistProductIds, 
        loading: false
      })
      
      console.log('❤️ Wishlist Store - Updated State:', get())
      console.log('❤️ Wishlist Store - items.length:', items.length)
    } catch (error) {
      // Không reset state khi gặp lỗi 401 (token hết hạn)
      if (error.response?.status === 401) {
        set({ loading: false })
        return
      }
      
      set({ 
        error: error.response?.data?.message || 'Không thể tải danh sách yêu thích',
        loading: false
      })
    }
  },

  /**
   * ➕ addToWishlist - Thêm sản phẩm vào yêu thích
   */
  addToWishlist: async (productId) => {
    set({ loading: true })
    try {
      const response = await addToWishlistAPI(productId)
      toast.success("❤️ Đã thêm vào yêu thích")
      
      // Refresh wishlist để có data đầy đủ
      await get().fetchWishlist()
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Không thể thêm vào yêu thích"
      toast.error(`❌ ${errorMsg}`)
      set({ error: errorMsg, loading: false })
    }
  },

  /**
   * ➖ removeFromWishlist - Xóa sản phẩm khỏi yêu thích
   */
  removeFromWishlist: async (productId) => {
    set({ loading: true })
    try {
      const response = await removeFromWishlistAPI(productId)
      toast.success("🗑️ Đã xóa khỏi yêu thích")
      
      // Refresh wishlist để có data đầy đủ
      await get().fetchWishlist()
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Không thể xóa khỏi yêu thích"
      toast.error(`❌ ${errorMsg}`)
      set({ error: errorMsg, loading: false })
    }
  },

  /**
   * 🔄 toggleWishlist - Bật/tắt yêu thích
   */
  toggleWishlist: async (productId) => {
    set({ loading: true })
    try {
      const response = await toggleWishlistAPI(productId)
      
      // Hiển thị toast dựa trên action
      if (response.action === 'added') {
        toast.success("❤️ Đã thêm vào yêu thích")
      } else if (response.action === 'removed') {
        toast.success("🗑️ Đã xóa khỏi yêu thích")
      }
      
      // Refresh wishlist để có data đầy đủ
      await get().fetchWishlist()
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Không thể cập nhật yêu thích"
      toast.error(`❌ ${errorMsg}`)
      set({ error: errorMsg, loading: false })
    }
  },

  /**
   * 🧹 clearWishlist - Xóa tất cả yêu thích
   */
  clearWishlist: async () => {
    set({ loading: true })
    try {
      const response = await clearWishlistAPI()
      toast.success(`🗑️ Đã xóa ${response.data.removedCount} sản phẩm`)
      
      set({ 
        items: [], 
        wishlistProductIds: [], 
        loading: false 
      })
    } catch (error) {
      toast.error("❌ Không thể xóa tất cả")
      set({ 
        error: error.response?.data?.message || 'Lỗi', 
        loading: false 
      })
    }
  },

  /**
   * 🧹 resetWishlist - Reset state (khi logout)
   */
  resetWishlist: () => {
    set({ 
      items: [], 
      wishlistProductIds: [], 
      loading: false, 
      error: null
    })
  },

  // ========================================
  // 🔍 SELECTORS - Lấy data
  // ========================================

  /**
   * Lấy số lượng sản phẩm yêu thích
   */
  getWishlistCount: () => get().items.length,

  /**
   * Kiểm tra sản phẩm có trong yêu thích không
   */
  isInWishlist: (productId) => get().wishlistProductIds.includes(productId),
}))

export default useWishlistStore
