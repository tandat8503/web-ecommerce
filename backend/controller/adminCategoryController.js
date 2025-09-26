import prisma from '../config/prisma.js';
import { slugify } from '../utils/slugify.js';

export const listCategories = async (req, res) => {
  const context = { path: 'admin.categories.list', query: req.query };
  try {
    console.log('START', context);
    const { page = 1, limit = 10, q } = req.query;
    const where = q ? { name: { contains: q, mode: 'insensitive' } } : undefined;

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.category.count({ where })
    ]);

    const payload = { items, total, page: Number(page), limit: Number(limit) };
    console.log('END', { ...context, total: payload.total });
    return res.json(payload);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const getCategory = async (req, res) => {
  const context = { path: 'admin.categories.get', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }
    console.log('END', context);
    return res.json(category);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const createCategory = async (req, res) => {
  const context = { path: 'admin.categories.create', body: req.body };
  try {
    console.log('START', context);
    const { name, description, imageUrl, isActive } = req.body;
    const slug = (req.body.slug?.trim()) || slugify(name);

    const exists = await prisma.category.findUnique({ where: { slug } });
    if (exists) {
      console.warn('CONFLICT_SLUG', { ...context, slug });
      return res.status(409).json({ message: 'Slug already exists' });
    }

    const created = await prisma.category.create({
      data: { name, slug, description: description || null, imageUrl: imageUrl || null, isActive: isActive ?? true }
    });
    console.log('END', { ...context, id: created.id });
    return res.status(201).json(created);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

export const updateCategory = async (req, res) => {
  const context = { path: 'admin.categories.update', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.category.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }

    let { name, slug, description, imageUrl, isActive } = req.body;
    if (!slug && name) slug = slugify(name);

    if (slug && slug !== found.slug) {
      const duplicate = await prisma.category.findUnique({ where: { slug } });
      if (duplicate) {
        console.warn('CONFLICT_SLUG', { ...context, slug });
        return res.status(409).json({ message: 'Slug already exists' });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? found.name,
        slug: slug ?? found.slug,
        description: description === undefined ? found.description : description,
        imageUrl: imageUrl === undefined ? found.imageUrl : imageUrl,
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

export const deleteCategory = async (req, res) => {
  const context = { path: 'admin.categories.delete', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.category.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      console.warn('HAS_PRODUCTS', { ...context, productCount });
      return res.status(400).json({ message: 'Cannot delete: category has products' });
    }

    await prisma.category.delete({ where: { id } });
    console.log('END', context);
    return res.json({ success: true });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};
