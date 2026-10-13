'use strict';
const { Router } = require('express');
const router = Router();
router.use('/spreads', require('./spread.routes'));
module.exports = router;
