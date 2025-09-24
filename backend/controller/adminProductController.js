import prisma from '../config/prisma.js';
import { slugify } from '../utils/slugify.js';

const includeBasic = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true } }
};

export const listProducts = async (req, res) => {
  const context = { path: 'admin.products.list', query: req.query };
  try {
    console.log('START', context);
    const { page = 1, limit = 10, q, categoryId, brandId } = req.query;
    const and = [];
    if (q) and.push({ name: { contains: q, mode: 'insensitive' } });
    if (categoryId) and.push({ categoryId: Number(categoryId) });
    if (brandId) and.push({ brandId: Number(brandId) });
    const where = and.length ? { AND: and } : undefined;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: includeBasic
      }),
      prisma.product.count({ where })
    ]);

    const payload = { items, total, page: Number(page), limit: Number(limit) };
    console.log('END', { ...context, total: payload.total });
    return res.json(payload);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const getProduct = async (req, res) => {
  const context = { path: 'admin.products.get', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const product = await prisma.product.findUnique({ where: { id }, include: includeBasic });
    if (!product) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }
    console.log('END', { ...context, id });
    return res.json(product);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const createProduct = async (req, res) => {
  const context = { path: 'admin.products.create', body: req.body };
  try {
    console.log('START', context);
    const {
      name, slug: slugInput, sku, price, stock, description,
      categoryId, brandId, isActive
    } = req.body;

    const [cat, br] = await Promise.all([
      prisma.category.findUnique({ where: { id: Number(categoryId) } }),
      prisma.brand.findUnique({ where: { id: Number(brandId) } })
    ]);
    if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });
    if (!br) return res.status(400).json({ message: 'Invalid brandId' });

    const slug = slugInput?.trim() || slugify(name);

    const [dupSlug, dupSku] = await Promise.all([
      prisma.product.findUnique({ where: { slug } }),
      prisma.product.findUnique({ where: { sku } })
    ]);
    if (dupSlug) {
      console.warn('CONFLICT_SLUG', { ...context, slug });
      return res.status(409).json({ message: 'Slug already exists' });
    }
    if (dupSku) {
      console.warn('CONFLICT_SKU', { ...context, sku });
      return res.status(409).json({ message: 'SKU already exists' });
    }

    const created = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        price: String(price),
        stockQuantity: stock ?? 0,
        description: description || null,
        categoryId: Number(categoryId),
        brandId: Number(brandId),
        status: 'ACTIVE',
        isFeatured: false,
      },
      include: includeBasic
    });

    console.log('END', { ...context, id: created.id });
    return res.status(201).json(created);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const updateProduct = async (req, res) => {
  const context = { path: 'admin.products.update', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.product.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }

    const data = { ...req.body };
    if (data.name && !data.slug) data.slug = slugify(data.name);

    if (data.slug && data.slug !== found.slug) {
      const dup = await prisma.product.findUnique({ where: { slug: data.slug } });
      if (dup) {
        console.warn('CONFLICT_SLUG', { ...context, slug: data.slug });
        return res.status(409).json({ message: 'Slug already exists' });
      }
    }

    if (data.sku && data.sku !== found.sku) {
      const dupSku = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (dupSku) {
        console.warn('CONFLICT_SKU', { ...context, sku: data.sku });
        return res.status(409).json({ message: 'SKU already exists' });
      }
    }

    if (data.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: Number(data.categoryId) } });
      if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });
      data.categoryId = Number(data.categoryId);
    }

    if (data.brandId) {
      const br = await prisma.brand.findUnique({ where: { id: Number(data.brandId) } });
      if (!br) return res.status(400).json({ message: 'Invalid brandId' });
      data.brandId = Number(data.brandId);
    }

    if (data.stock !== undefined) {
      data.stockQuantity = data.stock;
      delete data.stock;
    }

    if (data.price !== undefined) {
      data.price = String(data.price);
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: includeBasic
    });

    console.log('END', { ...context, id });
    return res.json(updated);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const deleteProduct = async (req, res) => {
  const context = { path: 'admin.products.delete', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.product.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }

    await prisma.product.delete({ where: { id } });
    console.log('END', { ...context, id });
    return res.json({ success: true });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};
