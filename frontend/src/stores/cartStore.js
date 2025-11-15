import { create } from 'zustand'
import { 
  getCart,
  addToCart as addToCartAPI,
  updateCartItem as updateCartItemAPI,
  removeFromCart as removeFromCartAPI,
  clearCart as clearCartAPI
} from '@/api/cart'
import { toast } from '@/lib/utils'

/**
 * 🛒 CART STORE - Quản lý state giỏ hàng
 * Match với backend response format (snake_case)
 */
const useCartStore = create((set, get) => ({
  items: [],
  totalQuantity: 0,
  totalAmount: 0,
  loading: false,
  error: null,
  isFetching: false,
  selectedIds: new Set(),

  fetchCart: async () => {
    if (get().isFetching) return
    set({ loading: true, error: null, isFetching: true })
    try {
      const response = await getCart()
      const items = response.data.cart || []
      const totalAmount = response.data.total_amount || 0 // Backend trả về total_amount (snake_case)
      const prevSelected = get().selectedIds
      const prevItemIds = new Set(get().items.map(item => item.id))
      const currentItemIds = new Set(items.map(item => item.id))

      const nextSelected = new Set(
        [...prevSelected].filter(id => currentItemIds.has(id))
      )

      items.forEach(item => {
        if (!prevItemIds.has(item.id)) {
          nextSelected.add(item.id)
        }
      })

      set({
        items,
        totalQuantity: items.length,
        totalAmount,
        loading: false,
        isFetching: false,
        selectedIds: nextSelected
      })
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Không thể tải giỏ hàng',
        loading: false,
        isFetching: false
      })
    }
  },

  addToCart: async (cartData) => {
    set({ loading: true })
    try {
      await addToCartAPI(cartData)
      toast.success("🛒 Đã thêm vào giỏ hàng")
      await get().fetchCart()
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.message || "Không thể thêm vào giỏ hàng"}`)
      set({ error: error.response?.data?.message, loading: false })
      throw error
    }
  },

  updateCartItem: async ({ cartItemId, quantity }) => {
    set({ loading: true })
    try {
      await updateCartItemAPI(cartItemId, quantity)
      toast.success("✅ Đã cập nhật số lượng")
      await get().fetchCart()
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.message || "Không thể cập nhật"}`)
      set({ error: error.response?.data?.message, loading: false })
    }
  },

  removeFromCart: async (cartItemId) => {
    set({ loading: true })
    try {
      await removeFromCartAPI(cartItemId)
      toast.success("🗑️ Đã xóa khỏi giỏ hàng")
      await get().fetchCart()
    } catch (error) {
      toast.error(`❌ ${error.response?.data?.message || "Không thể xóa"}`)
      set({ error: error.response?.data?.message, loading: false })
    }
  },

  clearCart: async () => {
    set({ loading: true })
    try {
      const response = await clearCartAPI()
      toast.success(`🗑️ Đã xóa ${response.data.removedCount} sản phẩm`)
      set({ items: [], totalQuantity: 0, totalAmount: 0, loading: false, isFetching: false, selectedIds: new Set() })
    } catch (error) {
      toast.error("❌ Không thể xóa tất cả")
      set({ error: error.response?.data?.message, loading: false, isFetching: false })
    }
  },

  resetCart: () => {
    set({ items: [], totalQuantity: 0, totalAmount: 0, loading: false, error: null, isFetching: false, selectedIds: new Set() })
  },

  setSelectedIds: (ids) => set({ selectedIds: new Set(ids) }),
  addSelectedId: (id) => set((state) => {
    const next = new Set(state.selectedIds)
    next.add(id)
    return { selectedIds: next }
  }),
  removeSelectedId: (id) => set((state) => {
    const next = new Set(state.selectedIds)
    next.delete(id)
    return { selectedIds: next }
  }),
  clearSelected: () => set({ selectedIds: new Set() }),
}))

export default useCartStore
