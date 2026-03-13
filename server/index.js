const express = require("express");
const cors = require("cors");
require("./db");

const healthRoutes = require("./features/health/health.routes");
const employeesRoutes = require("./features/employees/employees.routes");
const devicesRoutes = require("./features/devices/devices.routes");
const catalogRoutes = require("./features/catalog/catalog.routes");
const cartRoutes = require("./features/cart/cart.routes");
const ordersRoutes = require("./features/orders/orders.routes");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/products", catalogRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRoutes);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
