// Routes for treem_images
const express = require("express");
const router = express.Router();
const {
  getTreemImages,
  getImagesByTreEm,
  getTreemImageById,
  insertTreemImage,
  updateTreemImage,
  deleteTreemImage
} = require("../../controllers/chamsoc_module_controller/treem_images.controller");

// Lấy tất cả ảnh
router.get("/", getTreemImages);
// Lấy ảnh theo ID trẻ em
router.get("/child/:id_tre_em", getImagesByTreEm);
// Lấy ảnh theo ID ảnh
router.get("/:id_img", getTreemImageById);
// Thêm mới
router.post("/", insertTreemImage);
// Cập nhật
router.put("/:id_img", updateTreemImage);
// Xóa
router.delete("/:id_img", deleteTreemImage);

module.exports = router;
