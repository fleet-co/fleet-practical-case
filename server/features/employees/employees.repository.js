const { dbAll, dbGet, dbRun } = require("../../db");

const findAllEmployeesQuery = async ({ role, search } = {}) => {
  let sql = `
    SELECT e.id, e.name, e.role, e.created_at,
           COUNT(d.id) AS device_count
    FROM employees e
    LEFT JOIN devices d ON d.owner_id = e.id
    WHERE 1 = 1`;
  const params = [];

  if (role) {
    sql += " AND e.role = ?";
    params.push(role);
  }
  if (search) {
    sql += " AND (LOWER(e.name) LIKE ? OR LOWER(e.role) LIKE ?)";
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term);
  }

  sql += " GROUP BY e.id ORDER BY e.id DESC";
  return dbAll(sql, params);
};

const findEmployeeByIdQuery = async (id) => {
  return dbGet(
    `SELECT id, name, role, created_at FROM employees WHERE id = ?`,
    [id],
  );
};

const insertEmployeeQuery = async ({ name, role }) => {
  const { lastID } = await dbRun(
    `INSERT INTO employees (name, role) VALUES (?, ?)`,
    [name, role],
  );
  return findEmployeeByIdQuery(lastID);
};

const updateEmployeeQuery = async (id, { name, role }) => {
  const { changes } = await dbRun(
    `UPDATE employees SET name = ?, role = ? WHERE id = ?`,
    [name, role, id],
  );
  if (changes === 0) return undefined;
  return findEmployeeByIdQuery(id);
};

const unassignEmployeeDevicesQuery = async (employeeId) => {
  return dbRun(
    `UPDATE devices SET owner_id = NULL WHERE owner_id = ?`,
    [employeeId],
  );
};

const deleteEmployeeQuery = async (id) => {
  const { changes } = await dbRun(
    `DELETE FROM employees WHERE id = ?`,
    [id],
  );
  return changes > 0;
};

const findEmployeeRolesQuery = async () => {
  const rows = await dbAll(
    `SELECT DISTINCT role FROM employees ORDER BY role`,
  );
  return rows.map((r) => r.role);
};

module.exports = {
  findAllEmployeesQuery,
  findEmployeeRolesQuery,
  findEmployeeByIdQuery,
  insertEmployeeQuery,
  updateEmployeeQuery,
  unassignEmployeeDevicesQuery,
  deleteEmployeeQuery,
};
