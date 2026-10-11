const { Router } = require('express');
const strategiesController = require('../controllers/strategies.controller');

const router = Router();

router.get('/types', strategiesController.getStrategyTypes);
router.get('/types/:strategyType', strategiesController.getStrategyTypeById);
router.post('/build', strategiesController.buildStrategy);
router.post('/evaluate', strategiesController.evaluateStrategy);
router.get('/setups', strategiesController.getStrategySetups);
router.get('/setups/:id', strategiesController.getStrategySetupById);
router.post('/setups', strategiesController.postStrategySetup);
router.put('/setups/:id', strategiesController.putStrategySetup);
router.delete('/setups/:id', strategiesController.deleteStrategySetup);

module.exports = router;
