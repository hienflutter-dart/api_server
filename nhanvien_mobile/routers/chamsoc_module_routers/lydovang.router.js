const express = require("express");
const router = express.Router();
const c = require("../../controllers/chamsoc_module_controller/lydovang.controller");

router.get("/", c.getLyDo);
router.get("/:id", c.getLyDoById);

module.exports = router;
