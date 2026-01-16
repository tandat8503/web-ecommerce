# 📊 SEED DATA PLAN - E-COMMERCE NỘI THẤT VĂN PHÒNG

## 🎯 Mục Tiêu

Import data thực tế, phong phú cho:
- ✅ Dashboard backend/frontend có đủ data để test
- ✅ AI Chatbot có đủ products để tư vấn
- ✅ Demo cho Giảng viên impressive

---

## 📋 Data Cần Import

### **1. Products (100 sản phẩm)**

#### **Categories:**
- Bàn làm việc (30 products)
  - Bàn chữ L (10)
  - Bàn chữ U (10)
  - Bàn đơn (10)
  
- Ghế văn phòng (30 products)
  - Ghế xoay (10)
  - Ghế gaming (10)
  - Ghế công thái học (10)
  
- Bàn họp (15 products)
  - Bàn họp nhỏ 4-6 người (5)
  - Bàn họp trung 8-10 người (5)
  - Bàn họp lớn 12-20 người (5)
  
- Phụ kiện (25 products)
  - Kệ bàn (10)
  - Arm màn hình (10)
  - Tủ tài liệu (5)

#### **Brands:**
- Govi Furniture (hiện có)
- IKEA
- Hòa Phát
- Fami
- Xuân Hòa

#### **Price Ranges:**
- Budget: 1-3 triệu (30%)
- Mid-range: 3-7 triệu (50%)
- Premium: 7-15 triệu (20%)

---

### **2. Users (50 users)**

#### **Roles:**
- Admin: 2 users
- Customer: 48 users

#### **Profiles:**
- Verified users: 40
- Unverified users: 10
- With addresses: 35
- With orders: 25

---

### **3. Orders (100 orders)**

#### **Status Distribution:**
- PENDING: 10%
- CONFIRMED: 15%
- PROCESSING: 20%
- DELIVERED: 50%
- CANCELLED: 5%

#### **Payment:**
- COD: 60%
- VNPAY: 40%

#### **Time Range:**
- Last 6 months
- Realistic distribution (more recent orders)

---

### **4. Reviews (200 reviews)**

#### **Rating Distribution:**
- 5 stars: 50%
- 4 stars: 30%
- 3 stars: 15%
- 2 stars: 4%
- 1 star: 1%

#### **Content:**
- Realistic Vietnamese reviews
- Verified purchases: 80%

---

### **5. Coupons (20 coupons)**

#### **Types:**
- FIRST_ORDER: 5 coupons (300k off)
- FIRST_REVIEW: 3 coupons (100k off)
- GENERAL: 7 coupons (10-20% off)
- SHIPPING: 3 coupons (free ship)
- SEASONAL: 2 coupons (Tết, Black Friday)

---

### **6. Banners (5 banners)**

- Flash sale banner
- New arrivals banner
- Best sellers banner
- Seasonal promotion banner
- Brand showcase banner

---

## 🚀 Implementation Strategy

### **Phase 1: Products & Variants (1 giờ)**

**Script:** `seed_products.py`

**Features:**
- Generate 100 realistic products
- Each product has 1-3 variants (colors, sizes)
- AI-generated descriptions
- Realistic specs (dimensions, materials)
- Images (placeholder URLs)

**Example Product:**
```json
{
  "name": "Bàn Làm Việc Chữ L Govi GL-120",
  "slug": "ban-lam-viec-chu-l-govi-gl-120",
  "description": "Bàn làm việc chữ L Govi GL-120 với thiết kế hiện đại, tối ưu không gian làm việc. Kích thước 120x150cm phù hợp cho văn phòng vừa và nhỏ. Chất liệu gỗ MDF phủ Melamine chống nước, chống trầy xước. Chân bàn thép sơn tĩnh điện chắc chắn, có nút chống trầy sàn.",
  "category": "Bàn Chữ L",
  "brand": "Govi Furniture",
  "price": 4500000,
  "sale_price": 3990000,
  "variants": [
    {
      "color": "Nâu gỗ",
      "width": 1200,
      "depth": 1500,
      "height": 750,
      "material": "Gỗ MDF phủ Melamine",
      "stock": 15
    }
  ]
}
```

---

### **Phase 2: Users & Addresses (30 phút)**

**Script:** `seed_users.py`

**Features:**
- 50 realistic users
- Vietnamese names
- Realistic emails
- Addresses in major cities (HN, HCM, DN)
- Login history

---

### **Phase 3: Orders & Order Items (45 phút)**

**Script:** `seed_orders.py`

**Features:**
- 100 orders over 6 months
- Realistic order flow
- Multiple items per order
- Shipping fees (GHN integration ready)
- Payment records

---

### **Phase 4: Reviews & Comments (30 phút)**

**Script:** `seed_reviews.py`

**Features:**
- 200 realistic Vietnamese reviews
- AI-generated content
- Rating distribution
- Verified purchases
- Some with replies

---

### **Phase 5: Coupons & Banners (15 phút)**

**Script:** `seed_promotions.py`

**Features:**
- 20 coupons with realistic codes
- 5 banners with placeholder images
- Active/inactive status
- Usage tracking

---

## 📊 Data Quality Checklist

### **Products:**
- [x] 100 products
- [x] All have descriptions (AI-generated)
- [x] All have specs (dimensions, material)
- [x] All have variants
- [x] Realistic prices
- [x] Images (placeholder)

### **Users:**
- [x] 50 users
- [x] Realistic names & emails
- [x] Addresses in Vietnam
- [x] Login history

### **Orders:**
- [x] 100 orders
- [x] Realistic status distribution
- [x] Payment records
- [x] Order history

### **Reviews:**
- [x] 200 reviews
- [x] Realistic ratings
- [x] Vietnamese content
- [x] Verified purchases

### **Promotions:**
- [x] 20 coupons
- [x] 5 banners
- [x] Active campaigns

---

## 🎯 Expected Results

### **After Seeding:**

**Products:**
- Total: 122 products (22 existing + 100 new)
- Categories: All populated
- Brands: 5 brands
- Price range: 1M - 15M

**Users:**
- Total: 50+ users
- Active: 40+
- With orders: 25+

**Orders:**
- Total: 100+ orders
- Revenue: ~500M VNĐ (demo)
- Avg order value: 5M VNĐ

**Reviews:**
- Total: 200+ reviews
- Avg rating: 4.3/5
- Verified: 80%

**Dashboard Metrics:**
- ✅ Sales charts (6 months data)
- ✅ Top products
- ✅ Customer analytics
- ✅ Revenue reports

**AI Chatbot:**
- ✅ 100+ products to recommend
- ✅ Rich descriptions for advice
- ✅ Diverse categories
- ✅ Realistic use cases

---

## ⏱️ Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Products & Variants | 1h |
| 2 | Users & Addresses | 30min |
| 3 | Orders & Items | 45min |
| 4 | Reviews & Comments | 30min |
| 5 | Coupons & Banners | 15min |
| **Total** | | **3h** |

---

## 🚀 Next Steps

1. **Review this plan** - Bạn đồng ý không?
2. **Generate seed scripts** - Tôi tạo 5 scripts
3. **Run seeding** - Import data vào MySQL
4. **Verify data** - Check dashboard & AI chatbot
5. **Ready for demo!** 🎉

**Bạn đồng ý với plan này không?** 

Tôi sẽ bắt đầu tạo scripts ngay! 🚀
