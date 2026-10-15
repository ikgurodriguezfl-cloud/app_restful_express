const { Router } = require('express');
const brokerController = require('../controllers/broker.controller');

const router = Router();

router.get('/account', brokerController.getAccount);
router.get('/quotes', brokerController.getQuote);
router.get('/options-chain', brokerController.getOptionChain);

module.exports = router;
