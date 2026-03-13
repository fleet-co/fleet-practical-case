const { Router } = require("express");
const {
  findAllProductsQuery,
  findProductByIdQuery,
  insertProductQuery,
  updateProductQuery,
  deleteProductQuery,
  findProductCategoriesQuery,
} = require("./catalog.repository");

const router = Router();

const listProducts = async (req, res) => {
  const { category, search } = req.query;
  const products = await findAllProductsQuery({ category, search });
  res.json(products);
};

const getProduct = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid product id" });

  const product = await findProductByIdQuery(id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  res.json(product);
};

const createProduct = async (req, res) => {
  const name = (req.body.name || "").toString().trim();
  const description = (req.body.description || "").toString().trim();
  const price = Number(req.body.price);
  const category = (req.body.category || "").toString().trim();
  const stock = Number(req.body.stock) || 0;

  if (!name || !category) {
    return res.status(400).json({ message: "Name and category are required" });
  }
  if (!price || price <= 0) {
    return res.status(400).json({ message: "Price must be a positive number" });
  }

  const product = await insertProductQuery({ name, description, price, category, stock });
  res.status(201).json(product);
};

const updateProduct = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid product id" });

  const name = (req.body.name || "").toString().trim();
  const description = (req.body.description || "").toString().trim();
  const price = Number(req.body.price);
  const category = (req.body.category || "").toString().trim();
  const stock = Number(req.body.stock) || 0;

  if (!name || !category) {
    return res.status(400).json({ message: "Name and category are required" });
  }
  if (!price || price <= 0) {
    return res.status(400).json({ message: "Price must be a positive number" });
  }

  const product = await updateProductQuery(id, { name, description, price, category, stock });
  if (!product) return res.status(404).json({ message: "Product not found" });

  res.json(product);
};

const deleteProduct = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid product id" });

  const deleted = await deleteProductQuery(id);
  if (!deleted) return res.status(404).json({ message: "Product not found" });

  res.json({ success: true });
};

const listCategories = async (_req, res) => {
  const categories = await findProductCategoriesQuery();
  res.json(categories);
};

router.get("/categories", listCategories);
router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
