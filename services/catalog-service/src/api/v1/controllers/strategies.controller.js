const {
  strategyTypeCatalog,
  getStrategyTypeByCode,
  buildStrategyTemplate,
  isSupportedStrategyType,
  evaluateStrategySetup,
} = require('../../../strategies');
const {
  getStrategySetupsService,
  getStrategySetupByIdService,
  postStrategySetupService,
  putStrategySetupService,
  deleteStrategySetupService,
} = require('../../../strategies/strategy-setups.service');

const getStrategyTypes = async (_req, res, next) => {
  try {
    return res.status(200).json({ strategies: strategyTypeCatalog });
  } catch (error) {
    return next(error);
  }
};

const getStrategyTypeById = async (req, res, next) => {
  try {
    const { strategyType } = req.params;
    const strategy = getStrategyTypeByCode(strategyType);

    if (!strategy) {
      return res.status(404).json({ message: `Unsupported strategy type: ${strategyType}` });
    }

    return res.status(200).json({ strategy });
  } catch (error) {
    return next(error);
  }
};

const buildStrategy = async (req, res, next) => {
  try {
    const { strategyType, ...params } = req.body || {};

    if (!isSupportedStrategyType(strategyType)) {
      return res.status(400).json({ message: `Unsupported strategy type: ${strategyType}` });
    }

    const template = buildStrategyTemplate(strategyType, params);
    return res.status(200).json({ strategy: template });
  } catch (error) {
    return next(error);
  }
};

const evaluateStrategy = async (req, res, next) => {
  try {
    const { strategyType, ...params } = req.body || {};

    if (!isSupportedStrategyType(strategyType)) {
      return res.status(400).json({ message: `Unsupported strategy type: ${strategyType}` });
    }

    const evaluation = evaluateStrategySetup({ strategyType, ...params });
    return res.status(200).json({ evaluation });
  } catch (error) {
    return next(error);
  }
};

const getStrategySetups = async (req, res, next) => {
  try {
    const setups = await getStrategySetupsService(req.query);
    return res.status(200).json({ setups });
  } catch (error) {
    return next(error);
  }
};

const getStrategySetupById = async (req, res, next) => {
  try {
    const setup = await getStrategySetupByIdService(req.params.id);
    if (!setup) return res.status(404).json({ message: 'Strategy setup not found' });
    return res.status(200).json({ setup });
  } catch (error) {
    return next(error);
  }
};

const postStrategySetup = async (req, res, next) => {
  try {
    const setup = await postStrategySetupService(req.body || {});
    return res.status(201).json({ setup });
  } catch (error) {
    return next(error);
  }
};

const putStrategySetup = async (req, res, next) => {
  try {
    const setup = await putStrategySetupService(req.params.id, req.body || {});
    if (!setup) return res.status(404).json({ message: 'Strategy setup not found' });
    return res.status(200).json({ setup });
  } catch (error) {
    return next(error);
  }
};

const deleteStrategySetup = async (req, res, next) => {
  try {
    const setup = await deleteStrategySetupService(req.params.id, req.body?.updatedBy);
    if (!setup) return res.status(404).json({ message: 'Strategy setup not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStrategyTypes,
  getStrategyTypeById,
  buildStrategy,
  evaluateStrategy,
  getStrategySetups,
  getStrategySetupById,
  postStrategySetup,
  putStrategySetup,
  deleteStrategySetup,
};
