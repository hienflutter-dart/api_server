const express = require("express");
const router = express.Router();
const candoControllers = require("../../controllers/model_controllers_giosinhhoat/cando.controller");

// Lấy cân đo gần nhất của một trẻ theo id_tre_em
router.get("/:id_tre_em", candoControllers.getLatestCandoByTreEm);
router.get("/sosanh/:id_tre_em", candoControllers.getLatestAndPreviousByTreEm);

module.exports = router;
