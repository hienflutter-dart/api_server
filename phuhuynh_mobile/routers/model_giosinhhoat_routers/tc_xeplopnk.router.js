const express = require('express');
const router = express.Router();
const tc_xeplopnkController = require('../../controllers/model_controllers_giosinhhoat/tc_xeplopnk.controller');


router.get('/', tc_xeplopnkController.getAllTc_xeplopnk);
router.get('/:id', tc_xeplopnkController.getTc_xeplopnkById);
router.post('/', tc_xeplopnkController.createTc_xeplopnk);
router.put('/:id', tc_xeplopnkController.updateTc_xeplopnk);
router.delete('/:id', tc_xeplopnkController.deleteTc_xeplopnk);

module.exports = router;
module.exports = router;  