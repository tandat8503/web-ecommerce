import prisma from '../config/prisma.js';

export const listBrands = async (req, res) => {
  const context = { path: 'admin.brands.list', query: req.query };
  try {
    console.log('START', context);
    const { page = 1, limit = 10, q } = req.query;
    const where = q ? { name: { contains: q, mode: 'insensitive' } } : undefined;

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
    console.log('END', { ...context, total: payload.total });
    return res.json(payload);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const getBrand = async (req, res) => {
  const context = { path: 'admin.brands.get', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }
    console.log('END', context);
    return res.json(brand);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const createBrand = async (req, res) => {
  const context = { path: 'admin.brands.create', body: req.body };
  try {
    console.log('START', context);
    const { name, country, isActive } = req.body;

    const created = await prisma.brand.create({
      data: { 
        name, 
        country: country || null, 
        isActive: isActive ?? true 
      }
    });
    console.log('END', { ...context, id: created.id });
    return res.status(201).json(created);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const updateBrand = async (req, res) => {
  const context = { path: 'admin.brands.update', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.brand.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
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
    console.log('END', { ...context, id: updated.id });
    return res.json(updated);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const deleteBrand = async (req, res) => {
  const context = { path: 'admin.brands.delete', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.brand.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }

    const productCount = await prisma.product.count({ where: { brandId: id } });
    if (productCount > 0) {
      console.warn('HAS_PRODUCTS', { ...context, productCount });
      return res.status(400).json({ message: 'Cannot delete: brand has products' });
    }

    await prisma.brand.delete({ where: { id } });
    console.log('END', context);
    return res.json({ success: true });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

