function getAllProducts(db) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, name, price, created_at FROM products ORDER BY id",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

module.exports = { getAllProducts };
