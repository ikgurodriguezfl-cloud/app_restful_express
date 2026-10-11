# Proposal: Core Quant

## Problem
The project needs a quantitative options engine that can price instruments, compute Greeks, estimate implied volatility, ingest option chains from multiple providers, and evaluate strategy scenarios through a structured P&L matrix. This core must be reusable across multiple signal modules and trading strategies, but it must remain explainable and auditable for human review.

## Motivation
Options analysis requires a shared analytical foundation for many downstream modules. Without a quantitative core, each team would re-implement overlapping models and introduce inconsistencies across inputs, pricing, metrics, and risk outputs. A dedicated quant core provides a single contract for pricing logic, volatility estimation, provider ingestion, risk metrics, and margin calculations.

## Goals
- Define a reusable quantitative layer for option pricing and risk.
- Support Black-Scholes and Binomial models as primary pricing engines.
- Compute Greeks: Delta, Gamma, Theta, Vega, and Rho.
- Estimate implied volatility with a numerical root-finding method.
- Ingest option chains from multiple providers and normalize them into a common schema.
- Maintain a dynamic catalog of instruments, strategies, and market metadata.
- Compute margin and tier-based constraints for trading scenarios.
- Produce a scenario matrix for profit/loss across multiple asset and volatility conditions.

## Scope
- Option model infrastructure.
- Core model interfaces for pricing and risk.
- Multi-source chain ingestion and normalization.
- IV solver and volatility analytics.
- Dynamic catalog for option strategies and product metadata.
- Margin and tier layer.
- Scenario-based P&L matrix generation.
- Human-readable result structure for downstream teams.

## Out of scope
- Live broker execution.
- Real-time order routing.
- Auto-trading logic in v1.
- Personalized financial advice or guarantee of profitability.
- Full portfolio optimization or tax engineering.

## Success criteria
- The core can price a vanilla option under both Black-Scholes and Binomial assumptions.
- Greeks are computed consistently and output in a canonical result schema.
- Implied volatility is estimated numerically and validated against market data.
- Multi-source chain data is normalized into one representation regardless of provider.
- Margin tiers and scenario P&L are computed from the same data model used for trading decisions.
- The outputs are reusable by other teams that implement strategies or signals.
