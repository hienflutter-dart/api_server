const express = require('express');
const router = express.Router();
const { getLatestIndexWithCheck, listIndexes } = require('../../controllers/authcontrollers/indexcount.controller');

router.get('/latest', getLatestIndexWithCheck); // ?date=YYYY-MM-DD (optional)
router.get('/list',   listIndexes);             // ?limit=50 (optional)

module.exports = router;
