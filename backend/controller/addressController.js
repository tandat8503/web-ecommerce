import prisma from "../config/prisma.js";
import logger from "../utils/logger.js";

// Lấy danh sách địa chỉ (mặc định lên đầu)
export const getAddresses = async (req, res) => {
  const context = { path: 'address.list' };
  try {
    logger.start(context.path, { userId: req.user.id });
    
    const userId = req.user.id;
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });
    
    logger.success('Addresses fetched', { userId, count: addresses.length });
    logger.end(context.path, { count: addresses.length });
    res.status(200).json({ message: "Danh sách địa chỉ", addresses });
  } catch (error) {
    logger.error('Failed to fetch addresses', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

// Lấy chi tiết địa chỉ theo ID
export const getAddressById = async (req, res) => {
  const context = { path: 'address.get' };
  try {
    logger.start(context.path, { userId: req.user.id, id: req.params.id });
    
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(id)) {
      logger.warn('Invalid address ID', { id });
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    
    const address = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });
    
    if (!address) {
      logger.warn('Address not found', { id, userId });
      return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ" });
    }
    
    logger.success('Address fetched', { id, userId });
    logger.end(context.path, { id });
    res.status(200).json({ message: "Lấy chi tiết địa chỉ thành công", address });
  } catch (error) {
    logger.error('Failed to fetch address', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy địa chỉ mặc định
export const getDefaultAddress = async (req, res) => {
  const context = { path: 'address.getDefault' };
  try {
    logger.start(context.path, { userId: req.user.id });
    
    const userId = req.user.id;
    const address = await prisma.address.findFirst({
      where: { userId, isDefault: true },
    });
    
    if (!address) {
      logger.warn('No default address found', { userId });
      return res.status(404).json({ success: false, message: "Không tìm thấy địa chỉ mặc định" });
    }
    
    logger.success('Default address fetched', { id: address.id, userId });
    logger.end(context.path, { id: address.id });
    res.status(200).json({ message: "Lấy địa chỉ mặc định thành công", address });
  } catch (error) {
    logger.error('Failed to fetch default address', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Thêm địa chỉ mới
export const addAddress = async (req, res) => {
  const context = { path: 'address.create' };
  try {
    logger.start(context.path, { userId: req.user.id });
    
    const userId = req.user.id;
    const { fullName, phone, streetAddress, ward, district, city, postalCode, addressType, isDefault, note } = req.body;

    // Nếu user chưa có địa chỉ nào thì địa chỉ đầu tiên auto là mặc định
    const count = await prisma.address.count({ where: { userId } });
    
    // Giới hạn 10 địa chỉ
    if (count >= 10) {
      logger.warn('Address limit reached', { userId, count });
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
      logger.debug('Reset other default addresses', { userId });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        fullName,
        phone,
        streetAddress,
        ward: ward || null,
        district,
        city,
        postalCode: postalCode || null,
        addressType: addressType || 'HOME',
        isDefault: defaultStatus,
        note: note || null,
      },
    });

    logger.success('Address created', { id: address.id, userId, isDefault: defaultStatus });
    logger.end(context.path, { id: address.id });
    res.status(201).json({ message: "Thêm địa chỉ thành công", address });
  } catch (error) {
    logger.error('Failed to create address', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

// Cập nhật địa chỉ
export const updateAddress = async (req, res) => {
  const context = { path: 'address.update' };
  try {
    logger.start(context.path, { userId: req.user.id, id: req.params.id });
    
    const userId = req.user.id;
    const { id } = req.params;
    const { fullName, phone, streetAddress, ward, district, city, postalCode, addressType, isDefault, note } = req.body;

    if (!id || isNaN(id)) {
      logger.warn('Invalid address ID', { id });
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const found = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });

    if (!found) {
      logger.warn('Address not found', { id, userId });
      return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    }

    // Nếu set default => reset default các địa chỉ khác
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, id: { not: Number(id) } },
        data: { isDefault: false },
      });
      logger.debug('Reset other default addresses', { userId, exceptId: id });
    }

    const updated = await prisma.address.update({
      where: { id: Number(id) },
      data: {
        fullName: fullName ?? found.fullName,
        phone: phone ?? found.phone,
        streetAddress: streetAddress ?? found.streetAddress,
        ward: ward !== undefined ? ward : found.ward,
        district: district ?? found.district,
        city: city ?? found.city,
        postalCode: postalCode !== undefined ? postalCode : found.postalCode,
        addressType: addressType ?? found.addressType,
        isDefault: isDefault !== undefined ? isDefault : found.isDefault,
        note: note !== undefined ? note : found.note,
      },
    });

    logger.success('Address updated', { id: updated.id, userId });
    logger.end(context.path, { id: updated.id });
    res.status(200).json({ message: "Cập nhật địa chỉ thành công", address: updated });
  } catch (error) {
    logger.error('Failed to update address', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa địa chỉ
export const deleteAddress = async (req, res) => {
  const context = { path: 'address.delete' };
  try {
    logger.start(context.path, { userId: req.user.id, id: req.params.id });
    
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(id)) {
      logger.warn('Invalid address ID', { id });
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const found = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });

    if (!found) {
      logger.warn('Address not found', { id, userId });
      return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    }

    await prisma.address.delete({
      where: { id: Number(id) },
    });

    // Nếu xóa địa chỉ default => set default cho địa chỉ đầu tiên còn lại
    if (found.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
        logger.debug('Set new default address', { newDefaultId: firstAddress.id, userId });
      }
    }

    logger.success('Address deleted', { id, userId });
    logger.end(context.path, { id });
    res.status(200).json({ message: "Xóa địa chỉ thành công" });
  } catch (error) {
    logger.error('Failed to delete address', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Set địa chỉ mặc định
export const setDefaultAddress = async (req, res) => {
  const context = { path: 'address.setDefault' };
  try {
    logger.start(context.path, { userId: req.user.id, id: req.params.id });
    
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(id)) {
      logger.warn('Invalid address ID', { id });
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const found = await prisma.address.findFirst({
      where: { id: Number(id), userId },
    });

    if (!found) {
      logger.warn('Address not found', { id, userId });
      return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    }

    // Reset default của tất cả địa chỉ khác
    await prisma.address.updateMany({
      where: { userId, id: { not: Number(id) } },
      data: { isDefault: false },
    });

    // Set địa chỉ này làm default
    const updated = await prisma.address.update({
      where: { id: Number(id) },
      data: { isDefault: true },
    });

    logger.success('Default address set', { id: updated.id, userId });
    logger.end(context.path, { id: updated.id });
    res.status(200).json({ message: "Đặt địa chỉ mặc định thành công", address: updated });
  } catch (error) {
    logger.error('Failed to set default address', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};
