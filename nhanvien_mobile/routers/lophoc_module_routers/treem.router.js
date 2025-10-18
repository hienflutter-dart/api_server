const express = require("express");
const router = express.Router();
const { getTreEmByNhom, getTreEmDetail,getTreemInfo, getTreEmImages } = require("../../controllers/lophoc_module_controllers/treem.controller");

// Danh sách trẻ theo id_nhom_hoc
router.get("/nhom/:id_nhom_hoc", getTreEmByNhom);

// Chi tiết 1 trẻ (kèm ảnh)
// router.get("/:id_tre_em", getTreEmDetail);

// Chi tiết 1 trẻ ( ko kèm ảnh)
router.get("/:id", getTreemInfo);
router.get('/:id_tre_em/images', getTreEmImages);




module.exports = router;
