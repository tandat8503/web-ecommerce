import { RouterProvider } from 'react-router-dom'
import router from "@/routes/router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Toaster } from 'react-hot-toast';
import InitUserData from "@/components/InitUserData";
import InitUserSocket from "@/components/InitUserSocket";

function App() {
  return (
    <>
      {/* Init user data khi app load */}
      <InitUserData />

      {/* Init WebSocket để nhận thông báo real-time */}
      <InitUserSocket />

      {/* Router */}
      <RouterProvider router={router} />

      {/* Toast notifications */}
      {/* limit={1} - Chỉ hiển thị 1 toast tại một thời điểm, toast mới sẽ thay thế toast cũ */}
      <ToastContainer
        position="top-right"
        autoClose={800}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={1}
      />

      {/* React Hot Toast - For MyCoupons page */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  )
}

export default App
