const express = require('express');
const router = express.Router();
const xeplophocController = require('../../controllers/model_controllers_giosinhhoat/xeplophoc.controller');

router.get('/', xeplophocController.getAllXeplophoc);
router.get('/:id', xeplophocController.getXeplophocById);
router.post('/insert', xeplophocController.createXeplophoc);
router.put('/:id', xeplophocController.updateXeplophoc);
router.delete('/:id', xeplophocController.deleteXeplophoc);

module.exports = router;   