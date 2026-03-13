const { Router } = require("express");
const {
  findAllDevicesQuery,
  insertDeviceQuery,
  updateDeviceQuery,
  deleteDeviceQuery,
  employeeExistsQuery,
} = require("./devices.repository");

const router = Router();

const listDevices = async (req, res) => {
  const { type, ownerId, search } = req.query;
  const devices = await findAllDevicesQuery({ type, ownerId, search });
  res.json(devices);
};

const createDevice = async (req, res) => {
  const name = (req.body.name || "").toString().trim();
  const type = (req.body.type || "").toString().trim();
  const ownerId = req.body.ownerId ? Number(req.body.ownerId) : null;

  if (!name || !type) {
    return res.status(400).json({ message: "Both name and type are required" });
  }

  if (ownerId) {
    const exists = await employeeExistsQuery(ownerId);
    if (!exists) {
      return res.status(400).json({ message: "Owner employee does not exist" });
    }
  }

  const device = await insertDeviceQuery({ name, type, ownerId });
  res.status(201).json(device);
};

const updateDevice = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid device id" });

  const name = (req.body.name || "").toString().trim();
  const type = (req.body.type || "").toString().trim();
  const ownerId = req.body.ownerId ? Number(req.body.ownerId) : null;

  if (!name || !type) {
    return res.status(400).json({ message: "Both name and type are required" });
  }

  if (ownerId) {
    const exists = await employeeExistsQuery(ownerId);
    if (!exists) {
      return res.status(400).json({ message: "Owner employee does not exist" });
    }
  }

  const device = await updateDeviceQuery(id, { name, type, ownerId });
  if (!device) return res.status(404).json({ message: "Device not found" });

  res.json(device);
};

const deleteDevice = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid device id" });

  const deleted = await deleteDeviceQuery(id);
  if (!deleted) return res.status(404).json({ message: "Device not found" });

  res.json({ success: true });
};

router.get("/", listDevices);
router.post("/", createDevice);
router.put("/:id", updateDevice);
router.delete("/:id", deleteDevice);

module.exports = router;
