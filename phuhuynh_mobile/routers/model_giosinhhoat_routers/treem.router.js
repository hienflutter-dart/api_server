const express = require("express");
const router = express.Router();
const {
  getTreEm,
  getTreEmById,
  getTreEmByIdLop,
  addTreEm,
  addTreemToLophoc,
  updateTreEm,
  deleteTreEm,
  getTreEmImages
} = require("../../controllers/model_controllers_giosinhhoat/treem.controller");


router.get("/", getTreEm); // Lấy tất cả trẻ
router.get("/:id", getTreEmById);  
router.get("/lop/:id_lop", getTreEmByIdLop);
router.get("/anh/:id", getTreEmImages);  

router.post("/", addTreEm); // Thêm mới trẻ
router.post("/insert", addTreemToLophoc); // Thêm trẻ vào lớp
router.put("/:id", updateTreEm); // Cập nhật thông tin trẻ
router.delete("/:id", deleteTreEm); // Xóa trẻ


module.exports = router;