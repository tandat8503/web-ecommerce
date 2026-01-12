import { Outlet } from "react-router-dom";
import UserHeader from "./UserHeader";
import UserFooter from "./UserFooter";
import ChatWidget from "@/pages/user/chatbox/ChatWidget";
import ZaloButton from "@/components/user/ZaloButton";

export default function UserLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <UserHeader />

      {/* Nội dung trang con */}
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
      <div className="fixed bottom-6 right-6 z-50">
        <ZaloButton />
      </div>
      <ChatWidget />  

      {/* Footer */}
      <UserFooter />
    </div>
  );
}
