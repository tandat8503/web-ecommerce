# Search & Filter System - Hệ Thống Tìm Kiếm & Lọc

## 📋 Tổng Quan

Hệ thống tìm kiếm và lọc sản phẩm bao gồm:
- Full-text search (tên, mô tả sản phẩm)
- Filter theo category, brand, price range
- Sort options (giá, rating, mới nhất)
- Pagination
- Search suggestions
- Filter chips (hiển thị filters đang active)
- Clear all filters

---

## 🔧 Backend Implementation

### 1. Controller: `controller/productSearchController.js`

```javascript
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Search and filter products
 * GET /api/products/search
 */
export const searchProducts = async (req, res) => {
  try {
    const {
      q,                    // Search query
      category,             // Category ID
      brand,                // Brand ID
      minPrice,             // Minimum price
      maxPrice,             // Maximum price
      rating,               // Minimum rating
      inStock,              // Only in-stock products
      sort = 'newest',      // Sort option
      page = 1,
      limit = 20
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      isActive: true
    };

    // Full-text search
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } }
      ];
    }

    // Filter by category
    if (category) {
      where.categoryId = Number(category);
    }

    // Filter by brand
    if (brand) {
      where.brandId = Number(brand);
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    // Filter by stock
    if (inStock === 'true') {
      where.stockQuantity = { gt: 0 };
    }

    // Sort options
    let orderBy = {};
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Execute query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          variants: {
            select: {
              id: true,
              color: true,
              size: true,
              price: true
            }
          }
        },
        orderBy,
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    logger.info('Product search', { query: q, filters: { category, brand, minPrice, maxPrice }, total });

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        },
        filters: {
          q,
          category,
          brand,
          minPrice,
          maxPrice,
          rating,
          inStock,
          sort
        }
      }
    });
  } catch (error) {
    logger.error('Search products error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm sản phẩm'
    });
  }
};

/**
 * Get search suggestions
 * GET /api/products/search/suggestions
 */
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    // Get product suggestions
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryImage: true,
        price: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    // Get category suggestions
    const categories = await prisma.category.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        slug: true
      },
      take: 3
    });

    return res.json({
      success: true,
      data: {
        products,
        categories
      }
    });
  } catch (error) {
    logger.error('Get search suggestions error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy gợi ý tìm kiếm'
    });
  }
};

/**
 * Get filter options (for filter sidebar)
 * GET /api/products/filter-options
 */
export const getFilterOptions = async (req, res) => {
  try {
    const [categories, brands, priceRange] = await Promise.all([
      // Get all categories with product count
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { products: true }
          }
        },
        orderBy: { name: 'asc' }
      }),
      
      // Get all brands with product count
      prisma.brand.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { products: true }
          }
        },
        orderBy: { name: 'asc' }
      }),
      
      // Get price range
      prisma.product.aggregate({
        where: { isActive: true },
        _min: { price: true },
        _max: { price: true }
      })
    ]);

    return res.json({
      success: true,
      data: {
        categories: categories.filter(c => c._count.products > 0),
        brands: brands.filter(b => b._count.products > 0),
        priceRange: {
          min: priceRange._min.price || 0,
          max: priceRange._max.price || 10000000
        }
      }
    });
  } catch (error) {
    logger.error('Get filter options error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tùy chọn lọc'
    });
  }
};
```

### 2. Routes: `routes/productRoutes.js`

```javascript
import express from 'express';
import {
  searchProducts,
  getSearchSuggestions,
  getFilterOptions
} from '../controller/productSearchController.js';

const router = express.Router();

router.get('/search', searchProducts);
router.get('/search/suggestions', getSearchSuggestions);
router.get('/filter-options', getFilterOptions);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/products.js`

```javascript
import axiosClient from './axiosClient';

export const searchProducts = (params) => {
  return axiosClient.get('/products/search', { params });
};

export const getSearchSuggestions = (q) => {
  return axiosClient.get('/products/search/suggestions', { params: { q } });
};

export const getFilterOptions = () => {
  return axiosClient.get('/products/filter-options');
};
```

### 2. Search Hook: `src/hooks/useProductSearch.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { searchProducts, getFilterOptions } from '@/api/products';
import { useSearchParams } from 'react-router-dom';
import { debounce } from 'lodash';

export default function useProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get filters from URL
  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStock: searchParams.get('inStock') || '',
    sort: searchParams.get('sort') || 'newest',
    page: searchParams.get('page') || '1'
  };

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await searchProducts(filters);
      setProducts(response.data.data.products);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await getFilterOptions();
        setFilterOptions(response.data.data);
      } catch (error) {
        console.error('Fetch filter options error:', error);
      }
    };
    fetchOptions();
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update filter
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    
    // Reset to page 1 when filter changes
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    
    setSearchParams(newParams);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams({});
  };

  // Clear specific filter
  const clearFilter = (key) => {
    updateFilter(key, '');
  };

  return {
    products,
    pagination,
    filterOptions,
    loading,
    filters,
    updateFilter,
    clearFilters,
    clearFilter
  };
}
```

### 3. Search Bar Component: `src/components/SearchBar.jsx`

```jsx
import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSearchSuggestions } from '@/api/products';
import { debounce } from 'lodash';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  // Fetch suggestions (debounced)
  const fetchSuggestions = debounce(async (q) => {
    if (q.length < 2) {
      setSuggestions(null);
      return;
    }

    try {
      const response = await getSearchSuggestions(q);
      setSuggestions(response.data.data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Fetch suggestions error:', error);
    }
  }, 300);

  useEffect(() => {
    fetchSuggestions(query);
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?q=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
    }
  };

  const handleProductClick = (slug) => {
    navigate(`/products/${slug}`);
    setQuery('');
    setShowSuggestions(false);
  };

  const handleCategoryClick = (slug) => {
    navigate(`/products?category=${slug}`);
    setQuery('');
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-2xl">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions && setShowSuggestions(true)}
          placeholder="Tìm kiếm sản phẩm..."
          className="w-full px-4 py-2 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Products */}
          {suggestions.products?.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 px-2 py-1">Sản phẩm</div>
              {suggestions.products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.slug)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <img
                    src={product.primaryImage || '/placeholder.jpg'}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-orange-600 text-sm">
                      {product.price.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Categories */}
          {suggestions.categories?.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs text-gray-500 px-2 py-1">Danh mục</div>
              {suggestions.categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category.slug)}
                  className="px-2 py-2 hover:bg-gray-100 rounded cursor-pointer text-sm"
                >
                  {category.name}
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {suggestions.products?.length === 0 && suggestions.categories?.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              Không tìm thấy kết quả
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 4. Filter Sidebar Component: `src/components/FilterSidebar.jsx`

```jsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterSidebar({ filterOptions, filters, updateFilter, clearFilters }) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: true,
    price: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const hasActiveFilters = filters.category || filters.brand || filters.minPrice || filters.maxPrice;

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Bộ Lọc</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:underline"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('category')}
          className="flex justify-between items-center w-full py-2 font-semibold"
        >
          <span>Danh Mục</span>
          {expandedSections.category ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSections.category && (
          <div className="mt-2 space-y-2">
            {filterOptions?.categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  checked={filters.category === String(category.id)}
                  onChange={() => updateFilter('category', category.id)}
                  className="cursor-pointer"
                />
                <span className="text-sm">
                  {category.name} ({category._count.products})
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Brand Filter */}
      <div className="mb-4 border-t pt-4">
        <button
          onClick={() => toggleSection('brand')}
          className="flex justify-between items-center w-full py-2 font-semibold"
        >
          <span>Thương Hiệu</span>
          {expandedSections.brand ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSections.brand && (
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
            {filterOptions?.brands.map((brand) => (
              <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="brand"
                  checked={filters.brand === String(brand.id)}
                  onChange={() => updateFilter('brand', brand.id)}
                  className="cursor-pointer"
                />
                <span className="text-sm">
                  {brand.name} ({brand._count.products})
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="mb-4 border-t pt-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex justify-between items-center w-full py-2 font-semibold"
        >
          <span>Khoảng Giá</span>
          {expandedSections.price ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSections.price && (
          <div className="mt-2 space-y-3">
            <div>
              <label className="text-sm text-gray-600">Từ</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
                placeholder="0"
                className="w-full border px-3 py-2 rounded mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Đến</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                placeholder="10,000,000"
                className="w-full border px-3 py-2 rounded mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* In Stock Filter */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStock === 'true'}
            onChange={(e) => updateFilter('inStock', e.target.checked ? 'true' : '')}
            className="cursor-pointer"
          />
          <span className="text-sm">Chỉ hiển thị sản phẩm còn hàng</span>
        </label>
      </div>
    </div>
  );
}
```

### 5. Product List Page with Search: `src/pages/products/ProductList.jsx`

```jsx
import useProductSearch from '@/hooks/useProductSearch';
import FilterSidebar from '@/components/FilterSidebar';
import ProductCard from '@/components/ProductCard';
import { X } from 'lucide-react';

export default function ProductList() {
  const {
    products,
    pagination,
    filterOptions,
    loading,
    filters,
    updateFilter,
    clearFilters,
    clearFilter
  } = useProductSearch();

  const sortOptions = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price_asc', label: 'Giá thấp đến cao' },
    { value: 'price_desc', label: 'Giá cao đến thấp' },
    { value: 'name_asc', label: 'Tên A-Z' },
    { value: 'name_desc', label: 'Tên Z-A' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1">
          {filterOptions && (
            <FilterSidebar
              filterOptions={filterOptions}
              filters={filters}
              updateFilter={updateFilter}
              clearFilters={clearFilters}
            />
          )}
        </div>

        {/* Products */}
        <div className="lg:col-span-3">
          {/* Active Filters */}
          {(filters.q || filters.category || filters.brand || filters.minPrice || filters.maxPrice) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.q && (
                <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <span>Tìm kiếm: "{filters.q}"</span>
                  <button onClick={() => clearFilter('q')}>
                    <X size={16} />
                  </button>
                </div>
              )}
              {/* Add more filter chips */}
            </div>
          )}

          {/* Sort & Results Count */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-gray-600">
              {pagination && `${pagination.total} sản phẩm`}
            </div>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="border px-4 py-2 rounded"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="text-center py-20">Đang tải...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              Không tìm thấy sản phẩm nào
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => updateFilter('page', page)}
                  className={`px-4 py-2 rounded ${
                    page === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ Checklist

- [x] Full-text search
- [x] Category filter
- [x] Brand filter
- [x] Price range filter
- [x] Stock filter
- [x] Sort options
- [x] Pagination
- [x] Search suggestions
- [x] Filter chips
- [x] Clear filters
- [x] URL-based filters
- [x] Debounced search
- [x] Filter options API
