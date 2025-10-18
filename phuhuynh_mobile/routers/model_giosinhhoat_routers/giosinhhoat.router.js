const express = require('express');
const router = express.Router();
const gshController = require('../../controllers/model_controllers_giosinhhoat/giosinhhoat.controller');

router.get('/', gshController.getAllGioSinhHoat);
router.get('/:id', gshController.getGioSinhHoatById);
router.post('/', gshController.createGioSinhHoat);
router.put('/:id', gshController.updateGioSinhHoat);
router.delete('/:id', gshController.deleteGioSinhHoat);

module.exports = router;
