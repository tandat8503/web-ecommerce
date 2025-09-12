import prisma from "../config/prisma.js";

// Lấy danh sách địa chỉ (mặc định lên đầu)
export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: "desc" }, // mặc định lên đầu
        { createdAt: "desc" },
      ],
    });
    res.status(200).json({  message: "Danh sách địa chỉ",  addresses });
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({  message: "Server error" });
  }
};

// Lấy chi tiết địa chỉ theo ID
export const getAddressById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const address = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });
    if (!address) {
      return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" });
    }
    res.status(200).json({ message: "Lấy chi tiết địa chỉ thành công", address });
  } catch (error) {
    console.error("Get address by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Thêm địa chỉ mới
export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, streetAddress, ward, district, city, postalCode, addressType, isDefault, note } = req.body;    

    // Nếu user chưa có địa chỉ nào thì địa chỉ đầu tiên auto là mặc định
    const count = await prisma.address.count({ where: { userId } });
        // Giới hạn 10 địa chỉ
    if (count >= 10) {
      return res.status(400).json({ message: "Bạn chỉ có thể lưu tối đa 10 địa chỉ" });
    }
        // Địa chỉ đầu tiên => auto mặc định
    let defaultStatus = isDefault || count === 0;

    // Nếu set default => reset default các địa chỉ khác
    if (defaultStatus) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        fullName,
        phone,
        streetAddress,
        ward,
        district,
        city,
        postalCode,
        addressType: addressType || "home",
        isDefault: defaultStatus,
        note,
      },
    });

    res.status(201).json({  message: "Thêm địa chỉ thành công",  address });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({  message: "Server error" });
  }
};

// Cập nhật địa chỉ
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { fullName, phone, streetAddress, ward, district, city, postalCode, addressType, isDefault, note } = req.body;

    // Kiểm tra có phải địa chỉ của user
    const checkAddress = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });
    if (!checkAddress) {
      return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" });
    }

    // Nếu set default => bỏ default các địa chỉ khác
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id: Number(id) },
      data: {
        fullName,
        phone,
        streetAddress,
        ward,
        district,
        city,
        postalCode,
        addressType,
        isDefault,
        note,
      },
    });

    res.status(200).json({ message: "Cập nhật địa chỉ thành công", updatedAddress });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Chọn địa chỉ mặc định
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    // Kiểm tra địa chỉ có thuộc user không
    const address = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });
    if (!address) {
      return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" });
    }

    // Reset default tất cả
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set cái mới
    await prisma.address.update({
      where: { id: Number(id) },
      data: { isDefault: true },
    });

    res.status(200).json({ message: "Đã chọn địa chỉ mặc định thành công" });
  } catch (error) {
    console.error("Set default address error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa địa chỉ
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const checkAddress = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });
    if (!checkAddress) {
      return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" });
    }

    // Nếu xóa địa chỉ mặc định => gán địa chỉ khác thành mặc định
    const wasDefault = checkAddress.isDefault;
    await prisma.address.delete({ where: { id: Number(id) } });

    if (wasDefault) {
      const another = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (another) {
        await prisma.address.update({
          where: { id: another.id },
          data: { isDefault: true },
        });
      }
    }

    res.status(200).json({ message: "Xóa địa chỉ thành công" });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy địa chỉ mặc định
export const getDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const address = await prisma.address.findFirst({
      where: { userId, isDefault: true },
    });
    res.status(200).json({ message: "Lấy địa chỉ mặc định thành công", address });
  } catch (error) {
    console.error("Get default address error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
