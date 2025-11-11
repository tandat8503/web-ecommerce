import { RouterProvider } from 'react-router-dom'
import router from "@/routes/router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import InitUserData from "@/components/InitUserData";

function App() {
  return (
    <>
      {/* Init user data khi app load */}
      <InitUserData />
      
      {/* Router */}
      <RouterProvider router={router} />
      
      {/* Toast notifications */}
      {/* limit={1} - Chỉ hiển thị 1 toast tại một thời điểm, toast mới sẽ thay thế toast cũ */}
      <ToastContainer 
        position="top-right" 
        autoClose={500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={1}
      />
    </>
  )
}

export default App
