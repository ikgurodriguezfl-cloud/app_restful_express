const { Router } = require('express');
const strategiesController = require('../controllers/strategies.controller');

const router = Router();

router.get('/types', strategiesController.getStrategyTypes);
router.get('/types/:strategyType', strategiesController.getStrategyType);
router.post('/build', strategiesController.buildStrategyTemplate);
router.post('/evaluate', strategiesController.evaluateStrategy);
router.get('/setups', strategiesController.getSetups);
router.post('/setups', strategiesController.createSetup);

module.exports = router;
