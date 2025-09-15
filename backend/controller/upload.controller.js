
// Upload ảnh
export const uploadImage = (req, res) => {
  try {
    // Trường hợp upload nhiều ảnh
    if (req.files && req.files.length > 0) {
      return res.json({
        code: 200,
        message: "Upload nhiều ảnh thành công",
        data: req.files.map((file) => ({
          url: file.path,        // link ảnh Cloudinary
          public_id: file.filename, // public_id để xóa
        })),
      });
    }

    // Trường hợp upload 1 ảnh
    if (req.file) {
      return res.json({
        code: 200,
        message: "Upload 1 ảnh thành công",
        data: {
          url: req.file.path,
          public_id: req.file.filename,
        },
      });
    }

    // Nếu không có ảnh nào
    return res.status(400).json({ message: "Chưa có file nào được tải lên" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};



