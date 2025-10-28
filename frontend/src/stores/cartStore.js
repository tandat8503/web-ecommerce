import { create } from 'zustand'
import { 
  getCart,
  getCartCount,
  addToCart as addToCartAPI,
  updateCartItem as updateCartItemAPI,
  removeFromCart as removeFromCartAPI,
  clearCart as clearCartAPI
} from '@/api/cart'
import { toast } from 'react-toastify'

/**
 * 🛒 CART STORE - Quản lý giỏ hàng VIẾT T2
 * 
 * 📋 CÁCH XÁC ĐỊNH STATE:
 * 1. Phân tích Backend API response format
 * 2. Xác định data cần thiết cho UI
 * 3. Thêm state cho loading, error handling
 * 4. Tạo selectors để lấy data dễ dàng
 * 
 * 🔄 LUỒNG HOẠT ĐỘNG:
 * Component → Zustand Action → API Call → Backend → Database → Response → Update State → Re-render
 */

const useCartStore = create((set, get) => ({
  // ========================================
  // 🏗️ STATE - Trạng thái
  // ========================================
  items: [],                    // Danh sách sản phẩm trong giỏ hàng (dựa vào hàm get lấy danh sách sản phẩm trong giỏ hàng)
  totalQuantity: 0,             // Số lượng UNIQUE sản phẩm dựa vào hàm get lấy số lượng sản phẩm trong giỏ hàng
  totalAmount: 0,                // Tổng tiền dựa vào hàm get lấy tổng tiền giỏ hàng
  loading: false,                // Trạng thái loading
  error: null,                   // Lỗi nếu có
  isFetching: false,             // Flag để prevent duplicate fetch calls

  // ========================================
  // 🚀 ACTIONS - Hành động
  // ========================================

  /**
   * 📥 fetchCart - Lấy danh sách giỏ hàng
   */
  fetchCart: async () => {
    console.log('🛒 Cart Store - fetchCart() called')
    
    // Prevent duplicate calls
    if (get().isFetching) {
      console.log('🛒 Cart Store - Already fetching, skipping...')
      return
    }
    
    // Bước 1: Set loading state để hiển thị spinner/loading UI
    set({ loading: true, error: null, isFetching: true })
    
    try {
      // Bước 2: Gọi API → Backend controller getCart()
      // Không cần kiểm tra token vì axiosClient đã tự động gắn token
      const response = await getCart()
      
      // Bước 4: Lấy data từ backend response
      // Backend trả về: { message: "...", cart: [...], totalAmount: 160000 }
      const items = response.data.cart || []           // ← Lấy array cart items từ response.cart
      const totalAmount = response.data.totalAmount || 0 // ← Lấy tổng tiền từ response.totalAmount
      
      console.log('🛒 Cart Store - Backend Response:', response.data)
      console.log('🛒 Cart Store - Items:', items)
      console.log('🛒 Cart Store - Items Length:', items.length)
      
      // Bước 5: Cập nhật Zustand state với data từ backend
      set({ 
        items,                           // ← Lưu array cart items vào state
        totalQuantity: items.length,     // ← Đếm số unique products (không phải tổng quantity)
        totalAmount,                     // ← Lưu tổng tiền từ backend
        loading: false,                  // ← Tắt loading state
        isFetching: false                // ← Tắt fetching flag
      })
      
      console.log('🛒 Cart Store - Updated State:', get())
      console.log('🛒 Cart Store - totalQuantity:', items.length)
    } catch (error) {
      // Bước 6: Xử lý lỗi nếu API call thất bại
      console.error('🛒 Cart Store - fetchCart() error:', error)
      console.error('🛒 Cart Store - Error response:', error.response)
      
      // Chỉ tắt loading và lưu error, KHÔNG reset state
      set({ 
        error: error.response?.data?.message || 'Không thể tải giỏ hàng',
        loading: false,
        isFetching: false
      })
    }
  },

  /**
   * 🔢 fetchCartCount - Lấy số lượng sản phẩm trong giỏ hàng
   * 
   * ⚠️ DEPRECATED: Không nên dùng function này nữa
   * ✅ Nên dùng fetchCart() để có data đồng bộ
   */
  fetchCartCount: async () => {
    // Chỉ gọi fetchCart() để đảm bảo đồng bộ
    await get().fetchCart()
  },

  /**
   * ➕ addToCart - Thêm sản phẩm vào giỏ hàng
   */
  addToCart: async (cartData) => {
    // Bước 1: Set loading state để hiển thị loading UI
    set({ loading: true })
    
    try {
      
      const response = await addToCartAPI(cartData)
      
      // Bước 3: Hiển thị thông báo thành công cho user
      toast.success("🛒 Đã thêm vào giỏ hàng")
      
      // Bước 4: Refresh cart để có data đầy đủ
      // Tại sao cần refresh? Vì addToCart chỉ trả về cartItem cơ bản,
      // không có full product info (name, image, price, etc.)
      // Nên cần gọi lại fetchCart() để lấy data đầy đủ
      await get().fetchCart()
    } catch (error) {
      // Bước 5: Xử lý lỗi nếu API call thất bại
      const errorMsg = error.response?.data?.message || "Không thể thêm vào giỏ hàng"
      toast.error(`❌ ${errorMsg}`)  // Hiển thị thông báo lỗi cho user
      set({ error: errorMsg, loading: false }) // Lưu error vào state
    }
  },

  /**
   * 🔄 updateCartItem - Cập nhật số lượng sản phẩm
   * 
   
   */
  updateCartItem: async ({ cartItemId, quantity }) => {
    set({ loading: true })
    try {
      const response = await updateCartItemAPI(cartItemId, quantity)
      toast.success("✅ Đã cập nhật số lượng")
      
      // Refresh cart để có data đầy đủ
      await get().fetchCart()
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Không thể cập nhật"
      toast.error(`❌ ${errorMsg}`)
      set({ error: errorMsg, loading: false })
    }
  },

  /**
   * ➖ removeFromCart - Xóa sản phẩm khỏi giỏ hàng
   * 
   
   */
  removeFromCart: async (cartItemId) => {
    set({ loading: true })
    try {
      const response = await removeFromCartAPI(cartItemId)
      toast.success("🗑️ Đã xóa khỏi giỏ hàng")
      
      // Refresh cart để có data đầy đủ
      await get().fetchCart()
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Không thể xóa"
      toast.error(`❌ ${errorMsg}`)
      set({ error: errorMsg, loading: false })
    }
  },

  /**
   * 🧹 clearCart - Xóa tất cả giỏ hàng
   * 
  
   */
  clearCart: async () => {
    set({ loading: true })
    try {
      const response = await clearCartAPI()
      toast.success(`🗑️ Đã xóa ${response.data.removedCount} sản phẩm`)
      
      set({ 
        items: [], 
        totalQuantity: 0, 
        totalAmount: 0, 
        loading: false,
        isFetching: false
      })
    } catch (error) {
      toast.error("❌ Không thể xóa tất cả")
      set({ 
        error: error.response?.data?.message || 'Lỗi', 
        loading: false,
        isFetching: false
      })
    }
  },

  /**
   * 🧹 resetCart - Reset state (khi logout)
   */
  resetCart: () => {
    set({ 
      items: [], 
      totalQuantity: 0, 
      totalAmount: 0, 
      loading: false, 
      error: null,
      isFetching: false
    })
  },

  // ========================================
  // 🔍 SELECTORS - Lấy data
  // ========================================

  /**
   * Lấy số lượng sản phẩm trong giỏ hàng
   */
  getCartCount: () => get().totalQuantity,

  /**
   * Lấy tổng tiền giỏ hàng
   */
  getTotalAmount: () => get().totalAmount,
}))

export default useCartStore
