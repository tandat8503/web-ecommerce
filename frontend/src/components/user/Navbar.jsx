import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FaBars, FaChevronDown } from "react-icons/fa";
import { getPublicCategories } from "@/api/adminCategories";
import { 
  onCategoryCreated, 
  onCategoryUpdated, 
  onCategoryDeleted 
} from "@/utils/socket";

export default function Navbar() {
  const [open, setOpen] = useState(false);//open mobile menu
  const [categories, setCategories] = useState([]); // Lưu tất cả categories
  const [menuItems, setMenuItems] = useState([
    { name: "Trang chủ", path: "/" },
  ]);
  const location = useLocation();//đường dẫn hiện tại

  /**
   * Hàm phân loại categories thành menu items
   * Tách ra thành useCallback để tái sử dụng khi socket cập nhật
   */
  const buildMenuItems = useCallback((categories) => {
    // Lọc categories thuộc nhóm Ghế Văn Phòng
    const gheCategories = categories.filter((cat) => {
      const name = cat.name.toLowerCase().trim();
      const slug = cat.slug.toLowerCase();
      return name.startsWith("ghế") || slug.startsWith("ghe");
    });

    // Lọc categories thuộc nhóm Bàn Văn Phòng
    const banCategories = categories.filter((cat) => {
      const name = cat.name.toLowerCase().trim();
      const slug = cat.slug.toLowerCase();
      return name.startsWith("bàn") || slug.startsWith("ban");
    });

    // Lọc các categories còn lại vào nhóm Nội Thất Khác
    const otherCategories = categories.filter(
      (cat) => !gheCategories.includes(cat) && !banCategories.includes(cat)
    );

    // Tạo menu items động
    const newMenuItems = [
      { name: "Trang chủ", path: "/" },
    ];

    // Thêm menu "Bàn Văn Phòng"
    if (banCategories.length > 0) {
      newMenuItems.push({
        name: "Bàn Văn Phòng",
        path: `/danh-muc/${banCategories[0].slug}`,
        categories: banCategories,
      });
    }

    // Thêm menu "Ghế Văn Phòng"
    if (gheCategories.length > 0) {
      newMenuItems.push({
        name: "Ghế Văn Phòng",
        path: `/danh-muc/${gheCategories[0].slug}`,
        categories: gheCategories,
      });
    }

    // Thêm menu "Nội Thất Khác"
    if (otherCategories.length > 0) {
      newMenuItems.push({
        name: "Nội Thất Khác",
        path: `/danh-muc/${otherCategories[0].slug}`,
        categories: otherCategories,
      });
    }

    return newMenuItems;
  }, []);

  // Fetch categories lần đầu
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getPublicCategories();
        const allCategories = response.data.items || [];
        setCategories(allCategories);
        setMenuItems(buildMenuItems(allCategories));
      } catch (error) {
        console.error("Lỗi khi tải categories:", error);
      }
    };

    fetchCategories();
  }, [buildMenuItems]);

  // ===== SOCKET REAL-TIME: Tự động cập nhật menu khi admin thay đổi danh mục =====
  useEffect(() => {
    // Lắng nghe khi có danh mục mới
    const unsubscribeCreated = onCategoryCreated((newCategory) => {
      if (newCategory.isActive) {
        setCategories((prev) => {
          // Kiểm tra xem danh mục đã tồn tại chưa (dựa trên id) để tránh duplicate
          const exists = prev.some((cat) => cat.id === newCategory.id);
          if (exists) {
            // Nếu đã tồn tại → Cập nhật thay vì thêm mới
            const updated = prev.map((cat) =>
              cat.id === newCategory.id ? { ...cat, ...newCategory } : cat
            );
            setMenuItems(buildMenuItems(updated));
            return updated;
          } else {
            // Nếu chưa tồn tại → Thêm mới vào đầu danh sách
            const updated = [newCategory, ...prev];
            setMenuItems(buildMenuItems(updated));
            return updated;
          }
        });
      }
    });

    // Lắng nghe khi có danh mục cập nhật
    const unsubscribeUpdated = onCategoryUpdated((updatedCategory) => {
      setCategories((prev) => {
        // Kiểm tra xem category có trong state không
        const exists = prev.some((cat) => cat.id === updatedCategory.id);
        
        let updated;
        if (exists) {
          // Nếu có → Cập nhật và filter
          updated = prev
            .map((cat) => (cat.id === updatedCategory.id ? { ...cat, ...updatedCategory } : cat))
            .filter((cat) => cat.isActive); // Loại bỏ nếu isActive = false
        } else {
          // Nếu không có trong state (đã bị filter trước đó)
          // VÀ isActive = true → Thêm lại vào
          if (updatedCategory.isActive) {
            updated = [updatedCategory, ...prev];
          } else {
            updated = prev; // Nếu isActive = false → Không thêm
          }
        }
        
        setMenuItems(buildMenuItems(updated));
        return updated;
      });
    });

    // Lắng nghe khi có danh mục bị xóa
    const unsubscribeDeleted = onCategoryDeleted((data) => {
      setCategories((prev) => {
        const updated = prev.filter((cat) => cat.id !== data.id);
        setMenuItems(buildMenuItems(updated));
        return updated;
      });
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [buildMenuItems]);

  return (
    <header className="sticky top-[120px] z-50 w-full bg-white shadow-[0_4px_12px_-2px_rgba(59,130,246,0.2)]">
      {/* Thanh màu xanh gradient ở trên cùng của navbar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500"></div>
      
      <div className="max-w-6xl mx-auto flex items-center justify-center px-4 py-4">
        {/* === MENU DESKTOP (ẩn trên mobile, hiện từ md trở lên) === */}
        <nav className="hidden md:flex items-center justify-center gap-10 text-gray-700 font-medium">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;//kiểm tra nếu đường dẫn hiện tại bằng đường dẫn của menu item
            const hasSubMenu = item.categories && item.categories.length > 0;//kiểm tra nếu menu item có dropdown

            // Menu item thường (không có dropdown) - dùng cho Trang chủ
            if (!hasSubMenu) {
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group relative transition-all duration-300 pb-1 ${
                    isActive ? "text-blue-600 font-semibold" : "text-gray-700"
                  }`}
                >
                  <span className="group-hover:text-blue-600 transition-colors duration-300">
                    {item.name}
                  </span>
                  {/* Thanh gạch dưới animation khi hover hoặc active */}
                  <span
                    className={`absolute left-0 bottom-0 h-[2px] rounded-full transition-all duration-300 ease-in-out ${
                      isActive ? "w-full bg-blue-600" : "w-0 bg-blue-600 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            }

            // Menu item có dropdown - dùng cho Ghế, Bàn, Nội Thất Khác
            // Sử dụng DropdownMenu component từ shadcn/ui
            return (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`group relative transition-all duration-300 pb-1 flex items-center gap-1 outline-none ${
                      isActive ? "text-blue-600 font-semibold" : "text-gray-700"
                    }`}
                  >
                    <span className="group-hover:text-blue-600 transition-colors duration-300">
                      {item.name}
                    </span>
                    {/* Icon mũi tên, tự động xoay khi dropdown mở */}
                    <FaChevronDown className="text-xs group-data-[state=open]:rotate-180 transition-transform duration-300" />
                    <span
                      className={`absolute left-0 bottom-0 h-[2px] rounded-full transition-all duration-300 ease-in-out ${
                        isActive ? "w-full bg-blue-600" : "w-0 bg-blue-600 group-hover:w-full"
                      }`}
                    />
                  </button>
                </DropdownMenuTrigger>
                
                {/* Dropdown content hiển thị khi click/hover vào menu item */}
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel className="uppercase text-xs text-gray-500">
                    {item.name}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Render danh sách categories con */}
                  {item.categories.map((category) => (
                    <DropdownMenuItem key={category.id} asChild>
                      <Link
                        to={`/danh-muc/${category.slug}`}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        {/* Hiển thị thumbnail nếu có */}
                        {category.imageUrl && (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <span>{category.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        {/* === MENU MOBILE (chỉ hiện trên mobile, ẩn từ md trở lên) === */}
        <div className="md:hidden ml-auto">
          {/* Sheet component từ shadcn - sidebar slide từ bên trái */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              {/* Nút hamburger menu để mở sidebar */}
              <Button variant="ghost" className="text-gray-700 hover:bg-gray-100 rounded-full">
                <FaBars size={22} />
              </Button>
            </SheetTrigger>
            
            {/* Sidebar content: rộng 75% màn hình trên mobile, 60% trên tablet */}
            <SheetContent side="left" className="w-[75%] sm:w-[60%] overflow-y-auto">
              <nav className="flex flex-col mt-10 space-y-3">
                {menuItems.map((item) => {
                  const hasSubMenu = item.categories && item.categories.length > 0;
                  const isActive = location.pathname === item.path;

                  // Menu item thường (không có accordion)
                  if (!hasSubMenu) {
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setOpen(false)} // Đóng sidebar khi click
                        className={`block py-2 px-3 rounded-lg text-base font-medium transition-colors border-b border-gray-100 pb-3 ${
                          isActive ? "text-blue-600 font-semibold bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  }

                  // Menu item có accordion - sử dụng Collapsible từ shadcn/ui
                  return (
                    <Collapsible key={item.name} className="border-b border-gray-100 pb-3">
                      <CollapsibleTrigger asChild>
                        <button
                          className={`w-full flex items-center justify-between text-left py-2 px-3 rounded-lg transition-colors ${
                            isActive ? "text-blue-600 font-semibold bg-blue-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-base font-medium">{item.name}</span>
                          {/* Icon mũi tên xoay khi accordion mở */}
                          <FaChevronDown className="text-xs transition-transform duration-300 data-[state=open]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                      
                      {/* Nội dung accordion - danh sách categories con */}
                      <CollapsibleContent className="mt-2 ml-4 space-y-1">
                        {item.categories.map((category) => (
                          <Link
                            key={category.id}
                            to={`/danh-muc/${category.slug}`}
                            onClick={() => setOpen(false)} // Đóng sidebar khi chọn category
                            className="flex items-center gap-3 py-2 px-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            {/* Thumbnail category (nhỏ hơn desktop) */}
                            {category.imageUrl && (
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="w-6 h-6 object-cover rounded"
                              />
                            )}
                            <span>{category.name}</span>
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
