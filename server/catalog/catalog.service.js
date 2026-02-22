const catalogRepository = require("./catalog.repository");

function getProducts(db) {
  return catalogRepository.getAllProducts(db);
}

module.exports = { getProducts };
