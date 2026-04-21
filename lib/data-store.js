require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const otpStore = new Map();
const memoryCustomers = new Map();
const memoryOrders = [];
const memoryProducts = [];

/** @type {import('mysql2/promise').Pool | null} */
let pool = null;
/** @type {Array<Record<string, string>>} */
let fileCustomers = [];
/** @type {Array<Record<string, any>>} */
let fileOrders = [];
/** @type {Array<Record<string, any>>} */
let fileProducts = [];
/** @type {string | null} */
let fileStorePath = null;
/** @type {string | null} */
let fileOrdersPath = null;
/** @type {string | null} */
let fileProductsPath = null;
/** @type {'mysql' | 'file' | 'memory'} */
let dbKind = "memory";
let initPromise = null;

function getFileStorePath() {
  if (process.env.CUSTOMERS_FILE) {
    return path.resolve(process.env.CUSTOMERS_FILE);
  }
  return path.join(process.cwd(), "customers.json");
}

function getOrdersFilePath() {
  return path.join(process.cwd(), "orders.json");
}

function getProductsFilePath() {
  return path.join(process.cwd(), "products.json");
}

async function ensureParentDirectory(filename) {
  const directory = path.dirname(filename);
  if (directory && directory !== "." && !fs.existsSync(directory)) {
    await fs.promises.mkdir(directory, { recursive: true });
  }
}

function normalizeCustomerRecord(customer) {
  return {
    id: String(customer.id || `CUS${Date.now()}`),
    fullName: String(customer.fullName || "").trim(),
    phone: String(customer.phone || "").trim(),
    email: String(customer.email || "").trim(),
    address: String(customer.address || "").trim(),
    password: String(customer.password || ""),
    createdAt: String(customer.createdAt || new Date().toISOString()),
  };
}

async function readCustomersFromFile(filename) {
  try {
    const raw = await fs.promises.readFile(filename, "utf8");
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Customer file must contain a JSON array.");
    }

    return parsed.map(normalizeCustomerRecord);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function initMySQL() {
  const dbName = String(process.env.DB_NAME || "night_foodies").replace(/`/g, "");
  const baseConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  const bootstrap = mysql.createPool(baseConfig);
  await bootstrap.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await bootstrap.end();

  pool = mysql.createPool({ ...baseConfig, database: dbName });

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      fullName VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255) DEFAULT '',
      address TEXT,
      password VARCHAR(255) NOT NULL,
      createdAt VARCHAR(64),
      UNIQUE KEY uq_customers_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  dbKind = "mysql";
  console.log("Database mode: MySQL");
}

async function persistFileCustomers() {
  if (!fileStorePath) {
    return;
  }
  await ensureParentDirectory(fileStorePath);
  await fs.promises.writeFile(fileStorePath, `${JSON.stringify(fileCustomers, null, 2)}\n`, "utf8");
}

async function persistFileOrders() {
  if (!fileOrdersPath) {
    return;
  }
  await ensureParentDirectory(fileOrdersPath);
  await fs.promises.writeFile(fileOrdersPath, `${JSON.stringify(fileOrders, null, 2)}\n`, "utf8");
}

async function persistFileProducts() {
  if (!fileProductsPath) {
    return;
  }
  await ensureParentDirectory(fileProductsPath);
  await fs.promises.writeFile(fileProductsPath, `${JSON.stringify(fileProducts, null, 2)}\n`, "utf8");
}

async function initFileStore(reason = "file") {
  fileStorePath = getFileStorePath();
  fileOrdersPath = getOrdersFilePath();
  fileProductsPath = getProductsFilePath();
  await ensureParentDirectory(fileStorePath);
  fileCustomers = await readCustomersFromFile(fileStorePath);
  fileOrders = await readJsonFile(fileOrdersPath);
  fileProducts = await readJsonFile(fileProductsPath);
  dbKind = "file";

  if (reason === "legacy-sqlite") {
    console.warn("DB_DRIVER=sqlite is now treated as local JSON file storage.");
  }

  console.log(`Database mode: file (${fileStorePath})`);
}

async function readJsonFile(filename) {
  try {
    const raw = await fs.promises.readFile(filename, "utf8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function initMemory(reason = "") {
  dbKind = "memory";
  const suffix = reason ? ` ${reason}` : "";
  console.warn(`Database mode: in-memory fallback${suffix} (data will reset between cold starts).`);
}

async function initFileStoreWithFallback(reason) {
  try {
    await initFileStore(reason);
  } catch (error) {
    console.warn("File-store init failed, switching to memory:", error.message || String(error));
    initMemory("(file storage unavailable)");
  }
}

async function initBestAvailableFallback(reason = "") {
  if (process.env.VERCEL) {
    initMemory(reason || "(Vercel deployment without MySQL)");
    return;
  }

  await initFileStoreWithFallback("file");
}

async function initMySQLWithFallback(reason = "") {
  try {
    await initMySQL();
  } catch (error) {
    console.warn("MySQL init failed, falling back:", error.message || String(error));
    await initBestAvailableFallback(reason || "(MySQL unavailable)");
  }
}

async function initDataStore() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const explicit = String(process.env.DB_DRIVER || "").toLowerCase().trim();
    const hasConfiguredMySQL = ["DB_HOST", "DB_USER", "DB_NAME"].every((key) => {
      const value = process.env[key];
      return typeof value === "string" && value.trim() !== "";
    });

    if (explicit === "mysql") {
      if (!hasConfiguredMySQL) {
        console.warn("DB_DRIVER=mysql requested, but DB_HOST, DB_USER and DB_NAME are required. Falling back.");
      } else {
        await initMySQLWithFallback("(MySQL unavailable)");
        return;
      }
    } else if (!explicit && hasConfiguredMySQL) {
      await initMySQLWithFallback("(MySQL unavailable)");
      return;
    }

    if (explicit === "memory") {
      initMemory("(forced by DB_DRIVER)");
      return;
    }

    if (process.env.VERCEL) {
      if (explicit === "sqlite" || explicit === "file" || explicit === "json") {
        console.warn("Local file storage is not persistent on Vercel. Using in-memory mode instead.");
      }

      await initBestAvailableFallback("(Vercel deployment without MySQL)");
      return;
    }

    if (explicit === "sqlite") {
      await initFileStoreWithFallback("legacy-sqlite");
      return;
    }

    if (explicit === "file" || explicit === "json" || !explicit) {
      await initFileStoreWithFallback(explicit || "file");
      return;
    }

    console.warn(`Unknown DB_DRIVER "${explicit}". Falling back to local file storage.`);
    await initFileStoreWithFallback("file");
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

async function findCustomerByPhone(phone) {
  await initDataStore();

  if (dbKind === "mysql") {
    const [rows] = await pool.execute("SELECT * FROM customers WHERE phone = ? LIMIT 1", [phone]);
    return rows[0] || null;
  }

  if (dbKind === "file") {
    return fileCustomers.find((customer) => customer.phone === phone) || null;
  }

  return memoryCustomers.get(phone) || null;
}

async function createCustomer(customer) {
  await initDataStore();

  const existing = await findCustomerByPhone(customer.phone);
  if (existing) {
    const error = new Error("Duplicate phone");
    error.code = "DUPLICATE_PHONE";
    throw error;
  }

  if (dbKind === "mysql") {
    await pool.execute(
      "INSERT INTO customers (id, fullName, phone, email, address, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        customer.id,
        customer.fullName,
        customer.phone,
        customer.email,
        customer.address,
        customer.password,
        customer.createdAt,
      ]
    );
    return;
  }

  if (dbKind === "file") {
    fileCustomers.push(normalizeCustomerRecord(customer));
    await persistFileCustomers();
    return;
  }

  memoryCustomers.set(customer.phone, customer);
}

function saveOtp(phone, otp, expiresAt) {
  otpStore.set(phone, { otp, expiresAt });
}

function getOtp(phone) {
  return otpStore.get(phone) || null;
}

function clearOtp(phone) {
  otpStore.delete(phone);
}

/* ===== ORDERS ===== */
async function createOrder(order) {
  await initDataStore();
  const orderRecord = {
    id: `ORD${Date.now()}`,
    customerPhone: String(order.customerPhone || ""),
    customerName: String(order.customerName || ""),
    customerAddress: String(order.customerAddress || ""),
    items: order.items || [],
    subtotal: Number(order.subtotal || 0),
    deliveryFee: Number(order.deliveryFee || 0),
    total: Number(order.total || 0),
    paymentMethod: String(order.paymentMethod || "cod"),
    status: "placed",
    createdAt: new Date().toISOString(),
  };

  if (dbKind === "mysql") {
    await pool.execute(
      "INSERT INTO orders (id, customerPhone, customerName, customerAddress, items, subtotal, deliveryFee, total, paymentMethod, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        orderRecord.id,
        orderRecord.customerPhone,
        orderRecord.customerName,
        orderRecord.customerAddress,
        JSON.stringify(orderRecord.items),
        orderRecord.subtotal,
        orderRecord.deliveryFee,
        orderRecord.total,
        orderRecord.paymentMethod,
        orderRecord.status,
        orderRecord.createdAt,
      ]
    );
    return orderRecord;
  }

  if (dbKind === "file") {
    fileOrders.push(orderRecord);
    await persistFileOrders();
    return orderRecord;
  }

  memoryOrders.push(orderRecord);
  return orderRecord;
}

async function getOrders() {
  await initDataStore();
  if (dbKind === "mysql") {
    const [rows] = await pool.execute("SELECT * FROM orders ORDER BY createdAt DESC");
    return rows.map((r) => ({ ...r, items: JSON.parse(r.items || "[]") }));
  }
  if (dbKind === "file") return [...fileOrders].reverse();
  return [...memoryOrders].reverse();
}

/* ===== PRODUCTS ===== */
async function getProducts() {
  await initDataStore();
  if (dbKind === "mysql") {
    const [rows] = await pool.execute("SELECT * FROM products ORDER BY id");
    return rows;
  }
  if (dbKind === "file") return [...fileProducts];
  return [...memoryProducts];
}

async function addProduct(product) {
  await initDataStore();
  const productRecord = {
    id: Number(product.id) || Date.now(),
    name: String(product.name || ""),
    qty: String(product.qty || ""),
    category: String(product.category || ""),
    price: Number(product.price || 0),
    emoji: String(product.emoji || ""),
    createdAt: new Date().toISOString(),
  };

  if (dbKind === "mysql") {
    await pool.execute(
      "INSERT INTO products (id, name, qty, category, price, emoji, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        productRecord.id,
        productRecord.name,
        productRecord.qty,
        productRecord.category,
        productRecord.price,
        productRecord.emoji,
        productRecord.createdAt,
      ]
    );
    return productRecord;
  }

  if (dbKind === "file") {
    const existing = fileProducts.findIndex((p) => p.id === productRecord.id);
    if (existing >= 0) fileProducts[existing] = productRecord;
    else fileProducts.push(productRecord);
    await persistFileProducts();
    return productRecord;
  }

  const existing = memoryProducts.findIndex((p) => p.id === productRecord.id);
  if (existing >= 0) memoryProducts[existing] = productRecord;
  else memoryProducts.push(productRecord);
  return productRecord;
}

async function deleteProduct(productId) {
  await initDataStore();
  if (dbKind === "mysql") {
    await pool.execute("DELETE FROM products WHERE id = ?", [productId]);
    return;
  }
  if (dbKind === "file") {
    fileProducts = fileProducts.filter((p) => p.id !== productId);
    await persistFileProducts();
    return;
  }
  const idx = memoryProducts.findIndex((p) => p.id === productId);
  if (idx >= 0) memoryProducts.splice(idx, 1);
}

function getDbKind() {
  return dbKind;
}

module.exports = {
  addProduct,
  clearOtp,
  createCustomer,
  createOrder,
  deleteProduct,
  findCustomerByPhone,
  getDbKind,
  getOrders,
  getOtp,
  getProducts,
  initDataStore,
  saveOtp,
};
