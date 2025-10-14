import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FaBars } from "react-icons/fa";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: "Trang chủ", path: "/" },
    { name: "Giới thiệu", path: "/gioi-thieu" },
    { name: "Tất cả sản phẩm", path: "/san-pham" },
    { name: "Bàn", path: "/ban" },
    { name: "Ghế", path: "/ghe" },
    { name: "Tủ", path: "/tu" },
    { name: "Sofa", path: "/sofa" },
  ];

  return (
    <header className="sticky top-[120px] z-50 w-full bg-white shadow-[0_4px_12px_-2px_rgba(59,130,246,0.2)]">
      {/* Blue accent line */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500"></div>
      <div className="max-w-6xl mx-auto flex items-center justify-center px-4 py-4">
        {/* --- MENU DESKTOP --- */}
        <nav className="hidden md:flex items-center justify-center gap-10 text-gray-700 font-medium">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
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
                <span
                  className={`absolute left-0 bottom-0 h-[2px] rounded-full transition-all duration-300 ease-in-out ${
                    isActive
                      ? "w-full bg-blue-600"
                      : "w-0 bg-blue-600 group-hover:w-full"
                  }`}
                ></span>
              </Link>
            );
          })}
        </nav>

        {/* --- MENU MOBILE --- */}
        <div className="md:hidden ml-auto">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <FaBars size={22} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="bg-white text-gray-800 border-none w-[70%] sm:w-[50%]"
            >
              <nav className="flex flex-col mt-10 space-y-6 text-lg font-medium">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`transition-colors ${
                      location.pathname === item.path
                        ? "text-blue-600 font-semibold"
                        : "hover:text-blue-600"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
