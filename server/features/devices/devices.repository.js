const { dbAll, dbGet, dbRun } = require("../../db");

const findAllDevicesQuery = async ({ type, ownerId, search } = {}) => {
  let sql = `
    SELECT d.id, d.name, d.type, d.owner_id,
           d.created_at, e.name AS owner_name
    FROM devices d
    LEFT JOIN employees e ON e.id = d.owner_id
    WHERE 1 = 1`;
  const params = [];

  if (type) {
    sql += " AND d.type = ?";
    params.push(type);
  }
  if (ownerId) {
    sql += " AND d.owner_id = ?";
    params.push(ownerId);
  }
  if (search) {
    sql += " AND (LOWER(d.name) LIKE ? OR LOWER(d.type) LIKE ?)";
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term);
  }

  sql += " ORDER BY d.id DESC";
  return dbAll(sql, params);
};

const findDeviceByIdQuery = async (id) => {
  return dbGet(
    `SELECT d.id, d.name, d.type, d.owner_id,
            d.created_at, e.name AS owner_name
     FROM devices d
     LEFT JOIN employees e ON e.id = d.owner_id
     WHERE d.id = ?`,
    [id],
  );
};

const insertDeviceQuery = async ({ name, type, ownerId }) => {
  const { lastID } = await dbRun(
    `INSERT INTO devices (name, type, owner_id) VALUES (?, ?, ?)`,
    [name, type, ownerId],
  );
  return findDeviceByIdQuery(lastID);
};

const updateDeviceQuery = async (id, { name, type, ownerId }) => {
  const { changes } = await dbRun(
    `UPDATE devices SET name = ?, type = ?, owner_id = ? WHERE id = ?`,
    [name, type, ownerId, id],
  );
  if (changes === 0) return undefined;
  return findDeviceByIdQuery(id);
};

const deleteDeviceQuery = async (id) => {
  const { changes } = await dbRun(
    `DELETE FROM devices WHERE id = ?`,
    [id],
  );
  return changes > 0;
};

const employeeExistsQuery = async (id) => {
  const row = await dbGet(`SELECT id FROM employees WHERE id = ?`, [id]);
  return !!row;
};

module.exports = {
  findAllDevicesQuery,
  findDeviceByIdQuery,
  insertDeviceQuery,
  updateDeviceQuery,
  deleteDeviceQuery,
  employeeExistsQuery,
};
