import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

export const listBrands = async (req, res) => {
  const context = { path: 'admin.brands.list' };
  try {
    logger.start(context.path, { query: req.query });
    
    const { page = 1, limit = 10, q } = req.query;
    const where = q ? { name: { contains: q, mode: 'insensitive' } } : undefined;

    logger.debug('Query params', { page, limit, q });

    const [items, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.brand.count({ where })
    ]);

    const payload = { items, total, page: Number(page), limit: Number(limit) };
    logger.success('Brands fetched', { total });
    logger.end(context.path, { total });
    return res.json(payload);
  } catch (error) {
    logger.error('Failed to fetch brands', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

export const getBrand = async (req, res) => {
  const context = { path: 'admin.brands.get' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    const brand = await prisma.brand.findUnique({ where: { id } });
    
    if (!brand) {
      logger.warn('Brand not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }
    
    logger.success('Brand fetched', { id });
    logger.end(context.path, { id });
    return res.json(brand);
  } catch (error) {
    logger.error('Failed to fetch brand', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

export const createBrand = async (req, res) => {
  const context = { path: 'admin.brands.create' };
  try {
    logger.start(context.path, { name: req.body.name });
    
    const { name, country, isActive } = req.body;

    const created = await prisma.brand.create({
      data: { 
        name, 
        country: country || null, 
        isActive: isActive ?? true 
      }
    });
    
    logger.success('Brand created', { id: created.id, name: created.name });
    logger.end(context.path, { id: created.id });
    return res.status(201).json(created);
  } catch (error) {
    logger.error('Failed to create brand', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

export const updateBrand = async (req, res) => {
  const context = { path: 'admin.brands.update' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    const found = await prisma.brand.findUnique({ where: { id } });
    
    if (!found) {
      logger.warn('Brand not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    const { name, country, isActive } = req.body;

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        name: name ?? found.name,
        country: country === undefined ? found.country : country,
        isActive: isActive ?? found.isActive
      }
    });
    
    logger.success('Brand updated', { id, name: updated.name });
    logger.end(context.path, { id });
    return res.json(updated);
  } catch (error) {
    logger.error('Failed to update brand', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

export const deleteBrand = async (req, res) => {
  const context = { path: 'admin.brands.delete' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    const found = await prisma.brand.findUnique({ where: { id } });
    
    if (!found) {
      logger.warn('Brand not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    const productCount = await prisma.product.count({ where: { brandId: id } });
    if (productCount > 0) {
      logger.warn('Cannot delete brand with products', { id, productCount });
      return res.status(400).json({ message: 'Cannot delete: brand has products' });
    }

    await prisma.brand.delete({ where: { id } });
    
    logger.success('Brand deleted', { id, name: found.name });
    logger.end(context.path, { id });
    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete brand', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};
