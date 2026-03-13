const { Router } = require("express");
const {
  findAllEmployeesQuery,
  findEmployeeByIdQuery,
  findEmployeeRolesQuery,
  insertEmployeeQuery,
  updateEmployeeQuery,
  unassignEmployeeDevicesQuery,
  deleteEmployeeQuery,
} = require("./employees.repository");

const router = Router();

const listEmployees = async (req, res) => {
  const { role, search } = req.query;
  const employees = await findAllEmployeesQuery({ role, search });
  res.json(employees);
};

const getEmployee = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid employee id" });

  const employee = await findEmployeeByIdQuery(id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  res.json(employee);
};

const createEmployee = async (req, res) => {
  const name = (req.body.name || "").toString().trim();
  const role = (req.body.role || "").toString().trim();

  if (!name || !role) {
    return res.status(400).json({ message: "Both name and role are required" });
  }

  const employee = await insertEmployeeQuery({ name, role });
  res.status(201).json(employee);
};

const updateEmployee = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid employee id" });

  const name = (req.body.name || "").toString().trim();
  const role = (req.body.role || "").toString().trim();

  if (!name || !role) {
    return res.status(400).json({ message: "Both name and role are required" });
  }

  const employee = await updateEmployeeQuery(id, { name, role });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  res.json(employee);
};

const deleteEmployee = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid employee id" });

  await unassignEmployeeDevicesQuery(id);
  const deleted = await deleteEmployeeQuery(id);
  if (!deleted) return res.status(404).json({ message: "Employee not found" });

  res.json({ success: true });
};

const listRoles = async (_req, res) => {
  const roles = await findEmployeeRolesQuery();
  res.json(roles);
};

router.get("/", listEmployees);
router.get("/roles", listRoles);
router.get("/:id", getEmployee);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

module.exports = router;
