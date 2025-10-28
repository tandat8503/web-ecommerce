import { RouterProvider } from 'react-router-dom'
import router from "@/routes/router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import InitUserData from "@/components/InitUserData";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                📝 FILE #5 - VIẾT THỨ 5 (APP ROOT)                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
*/
 
 
function App() {
  return (
    <>
      {/* Init user data khi app load */}
      <InitUserData />
      
      {/* Router */}
      <RouterProvider router={router} />
      
      {/* Toast notifications */}
      <ToastContainer 
        position="top-right" 
        autoClose={500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  )
}

export default App
