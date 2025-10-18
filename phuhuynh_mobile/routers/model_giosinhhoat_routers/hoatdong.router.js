const express = require('express');
const router = express.Router();
const hoatdongController = require('../../controllers/model_controllers_giosinhhoat/hoatdong.controller');


router.get('/', hoatdongController.getAllHoatdong);
router.get('/:id', hoatdongController.getHoatdongById);
router.post('/', hoatdongController.createHoatdong);
router.put('/:id', hoatdongController.updateHoatdong);
router.delete('/:id', hoatdongController.deleteHoatdong);

module.exports = router;