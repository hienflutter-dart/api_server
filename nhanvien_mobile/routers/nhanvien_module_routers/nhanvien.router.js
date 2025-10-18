const express = require("express");
const router = express.Router();
const {
  getNhanvienById,
  updateNhanvien,
  updateNhanvienSelf,
  getAllNhanvien
} = require("../../controllers/nhanvien_module_controller/nhanvien.controller");

router.get('/', getAllNhanvien);    
router.get('/:id_nv', getNhanvienById);    
router.put('/:id_nv', updateNhanvien);
router.patch('/:id_nv/self', updateNhanvienSelf);



module.exports = router;
