const express = require("express");
const router = express.Router();
const {
  // nhóm
  listDatesByGroup,
  listByGroupAtDate,
  initGroupHandler,
  deleteByGroupDate,
  updateCandoValues,
  getCandoById,
  getCandoByTreEm,

  // nhân viên
  listDatesByStaff,
  listByStaffAtDate,
  initByStaff,
  deleteByStaffDate,
  updateCandoValuesByStaff,
} = require("../../controllers/chamsoc_module_controller/cando.controller");

// ====== THEO NHÂN VIÊN (client thường dùng) ======
router.get   ("/nv/:id_nv/dates", listDatesByStaff);                 // ?month=YYYY-MM [&id_index=]
router.get   ("/nv/:id_nv",       listByStaffAtDate);                // ?date=YYYY-MM-DD [&id_index=]
router.post  ("/nv/:id_nv/init",  initByStaff);                      // body: { date, id_index }
router.delete("/nv/:id_nv",       deleteByStaffDate);                // ?date=YYYY-MM-DD [&id_index=]
router.put   ("/nv/:id_nv/:id/values", updateCandoValuesByStaff);    // body: { ...; id_nv }

// ====== THEO NHÓM (admin dùng) ======
router.get   ("/group/:id_nhom_hoc/dates", listDatesByGroup);
router.get   ("/group/:id_nhom_hoc",       listByGroupAtDate);
router.post  ("/group/:id_nhom_hoc/init",  initGroupHandler);
router.delete("/group/:id_nhom_hoc",       deleteByGroupDate);

// ====== KHÁC ======
router.get("/tre/:id_tre_em", getCandoByTreEm);
router.put("/:id/values",     updateCandoValues); 
router.get("/:id",            getCandoById);

module.exports = router;
