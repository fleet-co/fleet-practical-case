const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const employeesRouter = require("./routes/employees");
const devicesRouter = require("./routes/devices");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
