const {
  blackScholesPrice,
  binomialPrice,
  computeGreeks,
  impliedVolatilityNewtonRaphson,
  buildPnlMatrix,
} = require('../../../quant');

const priceOption = async (req, res, next) => {
  try {
    const {
      spot,
      strike,
      rate = 0.05,
      volatility = 0.2,
      timeToMaturity = 1,
      optionType = 'call',
      model = 'black-scholes',
      steps = 100,
    } = req.body || {};

    const selectedModel = String(model).toLowerCase();
    const price = selectedModel === 'binomial'
      ? binomialPrice({ spot, strike, rate, volatility, timeToMaturity, optionType, steps })
      : blackScholesPrice({ spot, strike, rate, volatility, timeToMaturity, optionType });

    const greeks = computeGreeks({ spot, strike, rate, volatility, timeToMaturity, optionType });

    return res.status(200).json({
      model: selectedModel === 'binomial' ? 'binomial' : 'black-scholes',
      optionType,
      price,
      greeks,
    });
  } catch (error) {
    return next(error);
  }
};

const impliedVolatility = async (req, res, next) => {
  try {
    const {
      spot,
      strike,
      rate = 0.05,
      marketPrice,
      timeToMaturity = 1,
      optionType = 'call',
      initialGuess = 0.2,
      tolerance = 1e-8,
      maxIterations = 200,
    } = req.body || {};

    const result = impliedVolatilityNewtonRaphson({
      spot,
      strike,
      rate,
      marketPrice,
      timeToMaturity,
      optionType,
      initialGuess,
      tolerance,
      maxIterations,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const scenarioPnl = async (req, res, next) => {
  try {
    const {
      spot,
      strike,
      premium,
      optionType = 'call',
      scenarios = [-0.2, -0.1, 0, 0.1, 0.2],
      volatilityShift = 0,
      rate = 0.01,
      timeToMaturity = 0.5,
    } = req.body || {};

    const matrix = buildPnlMatrix({
      spot,
      strike,
      premium,
      optionType,
      scenarios,
      volatilityShift,
      rate,
      timeToMaturity,
    });

    return res.status(200).json({ matrix });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  priceOption,
  impliedVolatility,
  scenarioPnl,
};
