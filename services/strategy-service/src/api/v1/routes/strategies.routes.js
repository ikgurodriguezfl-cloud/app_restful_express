const { Router } = require('express');
const controller = require('../controllers/strategies.controller');

const router = Router();

router.get('/types', controller.getTypes);
router.get('/types/:strategyType', controller.getType);
router.post('/build', controller.build);
router.post('/evaluate', controller.evaluate);

router.get('/setups', controller.getSetups);
router.post('/setups', controller.createSetup);
router.post('/setups/batch', controller.createSetupsBatch);
router.patch('/setups/batch', controller.updateSetupsBatch);
router.delete('/setups/batch', controller.deleteSetupsBatch);

router.get('/setups/:setupId/legs/:legId', controller.getLeg);
router.get('/setups/:setupId/legs', controller.getLegs);
router.post('/setups/:setupId/legs', controller.createLeg);
router.put('/setups/:setupId/legs', controller.replaceLegs);
router.patch('/setups/:setupId/legs', controller.updateLegsBatch);
router.delete('/setups/:setupId/legs', controller.deleteLegsBatch);
router.put('/setups/:setupId/legs/:legId', controller.replaceLeg);
router.patch('/setups/:setupId/legs/:legId', controller.updateLeg);
router.delete('/setups/:setupId/legs/:legId', controller.deleteLeg);

router.get('/setups/:setupId', controller.getSetup);
router.put('/setups/:setupId', controller.replaceSetup);
router.patch('/setups/:setupId', controller.updateSetup);
router.delete('/setups/:setupId', controller.deleteSetup);

module.exports = router;
