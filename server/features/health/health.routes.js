const { Router } = require("express");

const router = Router();

const getHealth = (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
};

router.get("/", getHealth);

module.exports = router;
