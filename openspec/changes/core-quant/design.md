# Design: Core Quant

## Overview
The Core Quant module is the numerical and analytical foundation for option strategies and signal generation. It centralizes pricing, Greeks, volatility extraction, chain ingestion, dynamic catalog metadata, margin logic, and scenario-based P&L analysis.

## Objectives
- Offer a reusable quant engine for options-related modules.
- Ensure consistency across models and providers.
- Support both educational and production-oriented strategy analysis.
- Keep outputs auditable, explainable, and machine-readable.

## Components

### 1. Quant model layer
This layer implements the pricing engines and exposes a common interface for option evaluation.

Core interfaces:
- `OptionPricingModel`
- `GreeksCalculator`
- `ImpliedVolatilitySolver`
- `OptionChainNormalizer`
- `MarginCalculator`
- `ScenarioMatrixBuilder`

Supported engines:
- Black-Scholes model
- Binomial model

### 2. Pricing and Greeks engine
Responsibilities:
- Compute option price under selected model assumptions.
- Evaluate sensitivities to price, time, volatility, rates, and strike.
- Return a canonical result object with model metadata and assumptions.

Supported outputs:
- Price
- Delta
- Gamma
- Theta
- Vega
- Rho
- Model name and parameters used

### 3. Implied volatility engine
The IV module estimates volatility under market conditions using a numerical root-finding method.

Recommended approach:
- Use Newton-Raphson iteration with fallback to bisection or safeguarded search when needed.
- Accept a market option price and solve for the implied volatility that makes model price equal to observed market price.
- Return the estimated IV with convergence metadata and error bounds.

### 4. Option chain ingestion and normalization
This component abstracts provider-specific chain formats (OPRA, Cboe, Interactive Brokers, etc.) into a unified canonical schema.

Canonical chain fields:
- symbol
- expiration
- strike
- optionType
- bid
- ask
- last
- volume
- openInterest
- impliedVolatility
- provider
- timestamp

Normalization rules:
- Map provider-specific keys to a common contract.
- Standardize expiration and strike values.
- Preserve provider metadata while emitting a unified record.
- Detect missing or stale values before scoring.

### 5. Dynamic catalog layer
The catalog system stores option-related metadata that changes across products, strategies, and market contexts.

Examples:
- option strategy classification
- market regime tags
- instrument metadata
- risk tier definitions
- margin profile metadata

This layer uses the same catalog principles already present in the project: key/value metadata with a canonical API structure.

### 6. Margin and tier engine
The system calculates margin requirements and risk tiers based on trade structure, volatility, leverage, and strategy type.

Responsibility areas:
- Margin calculation by scenario and product type.
- Risk tier classification.
- Exposure multiplier and threshold validation.
- Margin usage summary for strategy approval.

### 7. Scenario P&L matrix
This component evaluates position outcomes under multiple market scenarios.

Typical scenarios:
- price moves up/down by x%
- volatility expansion / contraction
- time decay across a set of days to expiration
- changes in implied volatility and underlying price

Output should be a matrix with at least:
- base scenario name
- underlying price
- IV change
- option price
- P&L
- max loss
- max gain
- status

## Data model principles
- All quant outputs should be canonical and machine-readable.
- Provider-specific values must be normalized before analytic processing.
- Intermediate raw inputs should be kept for diagnostics and auditability.
- Strategy data and numeric output should remain decoupled from presentation code.

## Non-functional requirements
- The module must support multiple providers and a provider fallback strategy.
- Numeric outputs must be deterministic for a fixed input set.
- All calculations must acknowledge assumptions such as constant interest rate and volatility model.
- The system must expose enough metadata for explainability and debugging.
- The design must support future integration with backtesting, historical runs, and strategy evaluation.
