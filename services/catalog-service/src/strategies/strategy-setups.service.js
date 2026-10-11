const StrategySetup = require('./strategy-setup.model');
const { evaluateStrategySetup } = require('./index');

const buildSetupDocument = (data) => {
  const evaluation = evaluateStrategySetup(data);

  return {
    strategyType: evaluation.strategyType,
    symbol: evaluation.symbol,
    underlyingPrice: evaluation.underlyingPrice,
    expiration: evaluation.expiration,
    longLeg: {
      ...evaluation.longLeg,
      price: evaluation.longOption.price,
    },
    shortLeg: {
      ...evaluation.shortLeg,
      price: evaluation.shortOption.price,
    },
    assumptions: {
      rate: Number(data.rate ?? 0.05),
      volatility: Number(data.volatility ?? 0.2),
      timeToMaturity: Number(data.timeToMaturity ?? 0.5),
    },
    evaluation: {
      longOption: evaluation.longOption,
      shortOption: evaluation.shortOption,
      netPremium: evaluation.netPremium,
      maxProfit: evaluation.maxProfit,
      maxLoss: evaluation.maxLoss,
      breakEven: evaluation.breakEven,
      scenarioMatrix: evaluation.scenarioMatrix,
      evaluatedAt: new Date(),
    },
    notes: evaluation.notes,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
};

const getStrategySetupsService = async (filters = {}) => {
  const query = { active: true, deletedAt: null };

  if (filters.symbol) query.symbol = String(filters.symbol).toUpperCase();
  if (filters.strategyType) query.strategyType = String(filters.strategyType).toUpperCase();

  return StrategySetup.find(query).sort({ createdAt: -1 });
};

const getStrategySetupByIdService = async (id) => {
  return StrategySetup.findOne({ _id: id, active: true, deletedAt: null });
};

const postStrategySetupService = async (data) => {
  return new StrategySetup(buildSetupDocument(data)).save();
};

const putStrategySetupService = async (id, data) => {
  const current = await getStrategySetupByIdService(id);
  if (!current) return null;

  const next = buildSetupDocument({
    ...current.toObject(),
    ...data,
    longStrike: data.longStrike ?? current.longLeg.strike,
    shortStrike: data.shortStrike ?? current.shortLeg.strike,
    longQty: data.longQty ?? current.longLeg.quantity,
    shortQty: data.shortQty ?? current.shortLeg.quantity,
    rate: data.rate ?? current.assumptions.rate,
    volatility: data.volatility ?? current.assumptions.volatility,
    timeToMaturity: data.timeToMaturity ?? current.assumptions.timeToMaturity,
    strategyType: data.strategyType ?? current.strategyType,
    symbol: data.symbol ?? current.symbol,
    underlyingPrice: data.underlyingPrice ?? current.underlyingPrice,
    expiration: data.expiration ?? current.expiration,
    notes: data.notes ?? current.notes,
  });

  return StrategySetup.findOneAndUpdate(
    { _id: id, active: true, deletedAt: null },
    { ...next, updatedBy: data.updatedBy },
    { new: true, runValidators: true },
  );
};

const deleteStrategySetupService = async (id, updatedBy) => {
  return StrategySetup.findOneAndUpdate(
    { _id: id, active: true, deletedAt: null },
    { active: false, deletedAt: new Date(), updatedBy },
    { new: true },
  );
};

module.exports = {
  getStrategySetupsService,
  getStrategySetupByIdService,
  postStrategySetupService,
  putStrategySetupService,
  deleteStrategySetupService,
};
