// routes/module_chamsoc_routes/phanhoi.routes.js
const express = require("express");
const router = express.Router();
const {
  getPhanHoi,
  getPhanHoiById,
  getPhanHoiByTreEm,
  insertPhanHoi,
  updatePhanHoi,
  hidePhanHoi,
  checkNewPhanHoi,
  markSeenPhanHoi,
} = require("../../controllers/chamsoc_module_controller/phanhoi.controller");


router.get("/", getPhanHoi);

router.get("/check-new", checkNewPhanHoi);
router.patch("/:id/seen", markSeenPhanHoi);

router.get("/tre/:id_tre_em", getPhanHoiByTreEm);
router.get("/:id", getPhanHoiById);

router.post("/", insertPhanHoi);
router.put("/:id", updatePhanHoi);

// DELETE: ?action=hide (mặc định) hoặc ?action=revoke
router.delete("/:id", hidePhanHoi);


module.exports = router;
