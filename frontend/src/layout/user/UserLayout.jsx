import { Outlet } from "react-router-dom";
import UserHeader from "./UserHeader";
import UserFooter from "./UserFooter";

export default function UserLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <UserHeader />

      {/* Nội dung trang con */}
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>

      {/* Footer */}
      <UserFooter />
    </div>
  );
}
