const strategiesService = require('../services/strategies.service');

const handle = (action) => async (req, res, next) => {
  try {
    await action(req, res);
  } catch (error) {
    next(error);
  }
};

const getTypes = handle(async (req, res) => {
  res.status(200).json(strategiesService.getTypesService(req.query.phase));
});

const getType = handle(async (req, res) => {
  res.status(200).json(strategiesService.getTypeByNameService(req.params.strategyType));
});

const build = handle(async (req, res) => {
  res.status(200).json(strategiesService.buildStrategyService(req.body));
});

const evaluate = handle(async (req, res) => {
  res.status(200).json(await strategiesService.saveEvaluationService(req.body));
});

const getSetups = handle(async (req, res) => {
  res.status(200).json(await strategiesService.getSetupsService(req.query));
});

const getSetup = handle(async (req, res) => {
  res.status(200).json(await strategiesService.getSetupService(req.params.setupId));
});

const createSetup = handle(async (req, res) => {
  res.status(201).json(await strategiesService.createSetupService(req.body));
});

const updateSetup = handle(async (req, res) => {
  res.status(200).json(await strategiesService.updateSetupService(req.params.setupId, req.body));
});

const replaceSetup = handle(async (req, res) => {
  res.status(200).json(await strategiesService.replaceSetupService(req.params.setupId, req.body));
});

const deleteSetup = handle(async (req, res) => {
  await strategiesService.deleteSetupService(req.params.setupId);
  res.status(204).end();
});

const createSetupsBatch = handle(async (req, res) => {
  res.status(200).json(await strategiesService.createSetupsBatchService(req.body?.setups));
});

const updateSetupsBatch = handle(async (req, res) => {
  res.status(200).json(await strategiesService.updateSetupsBatchService(req.body?.operations));
});

const deleteSetupsBatch = handle(async (req, res) => {
  res.status(200).json(await strategiesService.deleteSetupsBatchService(req.body?.setupIds));
});

const getLegs = handle(async (req, res) => {
  res.status(200).json(await strategiesService.getLegsService(req.params.setupId));
});

const getLeg = handle(async (req, res) => {
  res.status(200).json(await strategiesService.getLegService(req.params.setupId, req.params.legId));
});

const createLeg = handle(async (req, res) => {
  const setup = await strategiesService.createLegService(req.params.setupId, req.body);
  res.status(201).json(setup);
});

const updateLeg = handle(async (req, res) => {
  res.status(200).json(await strategiesService.updateLegService(
    req.params.setupId,
    req.params.legId,
    req.body,
  ));
});

const replaceLeg = handle(async (req, res) => {
  res.status(200).json(await strategiesService.replaceLegService(
    req.params.setupId,
    req.params.legId,
    req.body,
  ));
});

const replaceLegs = handle(async (req, res) => {
  res.status(200).json(await strategiesService.replaceLegsService(req.params.setupId, req.body?.legs));
});

const updateLegsBatch = handle(async (req, res) => {
  res.status(200).json(await strategiesService.updateLegsBatchService(
    req.params.setupId,
    req.body?.operations,
  ));
});

const deleteLeg = handle(async (req, res) => {
  await strategiesService.deleteLegsService(req.params.setupId, [req.params.legId]);
  res.status(204).end();
});

const deleteLegsBatch = handle(async (req, res) => {
  res.status(200).json(await strategiesService.deleteLegsService(
    req.params.setupId,
    req.body?.legIds,
  ));
});

module.exports = {
  build,
  createLeg,
  createSetup,
  createSetupsBatch,
  deleteLeg,
  deleteLegsBatch,
  deleteSetup,
  deleteSetupsBatch,
  evaluate,
  getLeg,
  getLegs,
  getSetup,
  getSetups,
  getType,
  getTypes,
  replaceLegs,
  replaceLeg,
  replaceSetup,
  updateLeg,
  updateLegsBatch,
  updateSetup,
  updateSetupsBatch,
};
