const Product = require('../models/Product');

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { category, search, limit = 20, page = 1 } = req.query;
    const query = {};
    if (category) query.primaryCategory = { $regex: category, $options: 'i' };
    if (search) query.$text = { $search: search };

    const products = await Product.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-rawData -searchableText')
      .sort({ rating: -1 });

    const total = await Product.countDocuments(query);
    res.json({ products, total, page: Number(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id }).select('-rawData');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { productId: req.params.id },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    await Product.findOneAndDelete({ productId: req.params.id });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
