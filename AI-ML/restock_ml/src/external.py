"""
External factor computation module for the Restock Priority ML system.

Implements 24 external factor functions (3 per weight group × 8 groups).
Each function returns a float in [0.0, 1.0] unless otherwise noted.
"""

from typing import Dict, List, Union

import numpy as np


def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Return numerator / denominator, or *default* when denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator


# ---------------------------------------------------------------------------
# GROUP 1 — Demand Weight Factors (w1)
# ---------------------------------------------------------------------------

def compute_market_volatility(price_series: List[float]) -> float:
    """Market Volatility (MV) — coefficient of variation of a price series.

    MV = std(prices) / mean(prices), clipped to [0, 1].

    Parameters
    ----------
    price_series : list of float
        Historical price observations.

    Returns
    -------
    float
        Market volatility score in [0.0, 1.0].
    """
    arr = np.asarray(price_series, dtype=float)
    if len(arr) == 0:
        return 0.0
    mean = float(np.mean(arr))
    if mean == 0:
        return 0.0
    cv = float(np.std(arr)) / mean
    return float(np.clip(cv, 0.0, 1.0))


def compute_churn_rate(churned_customers: float, total_customers: float) -> float:
    """Customer Churn Rate (CCR).

    CCR = churned / total, clipped to [0, 1].

    Parameters
    ----------
    churned_customers : float
        Number of customers lost in the period.
    total_customers : float
        Total customers at the start of the period.

    Returns
    -------
    float
        Churn rate in [0.0, 1.0].
    """
    return float(np.clip(_safe_div(churned_customers, total_customers), 0.0, 1.0))


def compute_forecast_error(actual_demand: float, forecast_demand: float) -> float:
    """Demand Forecast Error (DFE).

    DFE = |actual - forecast| / actual, clipped to [0, 1].

    Parameters
    ----------
    actual_demand : float
        Observed demand.
    forecast_demand : float
        Predicted demand.

    Returns
    -------
    float
        Forecast error in [0.0, 1.0].
    """
    if actual_demand == 0:
        return 0.0
    error = abs(actual_demand - forecast_demand) / abs(actual_demand)
    return float(np.clip(error, 0.0, 1.0))


# ---------------------------------------------------------------------------
# GROUP 2 — Stock Level (w2)
# ---------------------------------------------------------------------------

def compute_warehouse_utilization(used_capacity: float, total_capacity: float) -> float:
    """Warehouse Utilization (WU).

    WU = used / capacity, clipped to [0, 1].

    Parameters
    ----------
    used_capacity : float
        Currently occupied warehouse space.
    total_capacity : float
        Total warehouse capacity.

    Returns
    -------
    float
        Utilization ratio in [0.0, 1.0].
    """
    return float(np.clip(_safe_div(used_capacity, total_capacity), 0.0, 1.0))


def compute_cash_flow_pressure(
    current_assets: float,
    current_liabilities: float,
) -> float:
    """Cash Flow Pressure (CFP).

    CFP = 1 - min(current_assets / current_liabilities, 1).
    Higher values indicate greater financial pressure.

    Parameters
    ----------
    current_assets : float
        Total current assets.
    current_liabilities : float
        Total current liabilities.

    Returns
    -------
    float
        Cash flow pressure in [0.0, 1.0].
    """
    ratio = min(_safe_div(current_assets, current_liabilities, default=1.0), 1.0)
    return float(np.clip(1.0 - ratio, 0.0, 1.0))


def compute_inventory_turnover(cogs: float, avg_inventory: float) -> float:
    """Inventory Turnover Ratio (ITR).

    ITR = COGS / avg_inventory.  This is a raw ratio and is **not**
    normalized to [0, 1].

    Parameters
    ----------
    cogs : float
        Cost of goods sold over the period.
    avg_inventory : float
        Average inventory value over the period.

    Returns
    -------
    float
        Inventory turnover ratio (unbounded).
    """
    return _safe_div(cogs, avg_inventory)


# ---------------------------------------------------------------------------
# GROUP 3 — Lead Time (w3)
# ---------------------------------------------------------------------------

def compute_supply_disruption_index(lpi_score: float) -> float:
    """Supply Chain Disruption Index (SCDI).

    SCDI = 1 - (LPI / 5.0).  A low LPI (Logistics Performance Index)
    implies higher disruption risk.

    Parameters
    ----------
    lpi_score : float
        World Bank Logistics Performance Index (typically 1–5).

    Returns
    -------
    float
        Disruption index in [0.0, 1.0].
    """
    return float(np.clip(1.0 - lpi_score / 5.0, 0.0, 1.0))


def compute_import_dependency(imported_units: float, total_units: float) -> float:
    """Import Dependency Ratio (IDR).

    IDR = imported / total, clipped to [0, 1].

    Parameters
    ----------
    imported_units : float
        Units sourced from imports.
    total_units : float
        Total units sourced.

    Returns
    -------
    float
        Import dependency in [0.0, 1.0].
    """
    return float(np.clip(_safe_div(imported_units, total_units), 0.0, 1.0))


def compute_geopolitical_risk(gpr_index: float) -> float:
    """Geopolitical Risk Index (GRI).

    GRI = min(GPR / 200.0, 1.0).

    Parameters
    ----------
    gpr_index : float
        Raw geopolitical risk index value.

    Returns
    -------
    float
        Normalized risk score in [0.0, 1.0].
    """
    return float(np.clip(gpr_index / 200.0, 0.0, 1.0))


# ---------------------------------------------------------------------------
# GROUP 4 — Profit Margin (w4)
# ---------------------------------------------------------------------------

def compute_competitive_price_pressure(
    competitor_price: float,
    your_price: float,
) -> float:
    """Competitive Price Pressure (CPP).

    CPP = max(0, (competitor - yours) / yours), clipped to [0, 1].

    Parameters
    ----------
    competitor_price : float
        Average competitor selling price.
    your_price : float
        Your selling price.

    Returns
    -------
    float
        Price pressure in [0.0, 1.0].
    """
    gap = max(0.0, _safe_div(competitor_price - your_price, your_price))
    return float(np.clip(gap, 0.0, 1.0))


def compute_price_elasticity(
    pct_demand_change: float,
    pct_price_change: float,
) -> float:
    """Price Elasticity of Demand (PED).

    PED = |pct_demand_change / pct_price_change|, clipped to [0, 1].

    Parameters
    ----------
    pct_demand_change : float
        Percentage change in quantity demanded.
    pct_price_change : float
        Percentage change in price.

    Returns
    -------
    float
        Elasticity score in [0.0, 1.0].
    """
    raw = abs(_safe_div(pct_demand_change, pct_price_change))
    return float(np.clip(raw, 0.0, 1.0))


def compute_industry_benchmark_gap(
    industry_margin: float,
    your_margin: float,
) -> float:
    """Industry Benchmark Gap (IBG).

    IBG = max(0, (industry - yours) / industry), clipped to [0, 1].

    Parameters
    ----------
    industry_margin : float
        Average industry profit margin.
    your_margin : float
        Your profit margin.

    Returns
    -------
    float
        Benchmark gap in [0.0, 1.0].
    """
    gap = max(0.0, _safe_div(industry_margin - your_margin, industry_margin))
    return float(np.clip(gap, 0.0, 1.0))


# ---------------------------------------------------------------------------
# GROUP 5 — Stockout Cost (w5)
# ---------------------------------------------------------------------------

def compute_market_competition_index(hhi_score: float) -> float:
    """Market Competition Index (MCI).

    MCI = 1 - (HHI / 10000).  A lower HHI means more competition.

    Parameters
    ----------
    hhi_score : float
        Herfindahl-Hirschman Index (0–10 000).

    Returns
    -------
    float
        Competition index in [0.0, 1.0].
    """
    return float(np.clip(1.0 - hhi_score / 10000.0, 0.0, 1.0))


def compute_switching_cost_index(switching_ease_rate: float) -> float:
    """Customer Switching Cost Index (CSC).

    CSC = 1 - switching_ease_rate.

    Parameters
    ----------
    switching_ease_rate : float
        How easily customers can switch (0–1, where 1 = trivially easy).

    Returns
    -------
    float
        Switching cost index in [0.0, 1.0].
    """
    return float(np.clip(1.0 - switching_ease_rate, 0.0, 1.0))


def compute_brand_loyalty_index(
    nps_score: float,
    repeat_purchase_rate: float,
) -> float:
    """Brand Loyalty Index (BLI).

    BLI = ((NPS + 100) / 200 + repeat_purchase_rate) / 2.

    Parameters
    ----------
    nps_score : float
        Net Promoter Score (−100 to +100).
    repeat_purchase_rate : float
        Fraction of customers who repurchase (0–1).

    Returns
    -------
    float
        Loyalty index in [0.0, 1.0].
    """
    nps_norm = (nps_score + 100.0) / 200.0
    bli = (nps_norm + repeat_purchase_rate) / 2.0
    return float(np.clip(bli, 0.0, 1.0))


# ---------------------------------------------------------------------------
# GROUP 6 — Holding Cost (w6)
# ---------------------------------------------------------------------------

def compute_interest_rate_factor(central_bank_rate: float) -> float:
    """Interest Rate Factor (IR).

    IR = min(rate / 0.20, 1.0).

    Parameters
    ----------
    central_bank_rate : float
        Central bank interest rate as a decimal (e.g. 0.05 for 5 %).

    Returns
    -------
    float
        Interest rate factor in [0.0, 1.0].
    """
    return float(np.clip(central_bank_rate / 0.20, 0.0, 1.0))


def compute_storage_cost_index(
    current_rate: float,
    benchmark_rate: float,
) -> float:
    """Storage Cost Index (SCI).

    SCI = min(current / benchmark, 1.0).

    Parameters
    ----------
    current_rate : float
        Current storage cost rate.
    benchmark_rate : float
        Industry benchmark storage cost rate.

    Returns
    -------
    float
        Storage cost index in [0.0, 1.0].
    """
    return float(np.clip(_safe_div(current_rate, benchmark_rate), 0.0, 1.0))


def compute_perishability_rate(expired_units: float, total_held: float) -> float:
    """Product Perishability Rate (PPR).

    PPR = expired / total_held, clipped to [0, 1].

    Parameters
    ----------
    expired_units : float
        Units that expired or spoiled.
    total_held : float
        Total units held in inventory.

    Returns
    -------
    float
        Perishability rate in [0.0, 1.0].
    """
    return float(np.clip(_safe_div(expired_units, total_held), 0.0, 1.0))


# ---------------------------------------------------------------------------
# GROUP 7 — Supplier (w7)
# ---------------------------------------------------------------------------

def compute_supplier_concentration(
    top_supplier_units: float,
    total_units: float,
) -> float:
    """Supplier Concentration Ratio (SCR).

    SCR = top_supplier / total, clipped to [0, 1].

    Parameters
    ----------
    top_supplier_units : float
        Units supplied by the dominant supplier.
    total_units : float
        Total units sourced across all suppliers.

    Returns
    -------
    float
        Concentration ratio in [0.0, 1.0].
    """
    return float(np.clip(_safe_div(top_supplier_units, total_units), 0.0, 1.0))


def compute_global_supply_volatility(lpi_score: float) -> float:
    """Global Supply Chain Volatility (GSCV).

    GSCV = 1 - (LPI / 5.0).

    Parameters
    ----------
    lpi_score : float
        World Bank Logistics Performance Index (typically 1–5).

    Returns
    -------
    float
        Supply volatility score in [0.0, 1.0].
    """
    return float(np.clip(1.0 - lpi_score / 5.0, 0.0, 1.0))


def compute_supplier_financial_health(credit_score: float) -> float:
    """Supplier Financial Health (SFH).

    SFH = min(credit_score / 850.0, 1.0).

    Parameters
    ----------
    credit_score : float
        Supplier credit score (0–850 scale).

    Returns
    -------
    float
        Financial health score in [0.0, 1.0].
    """
    return float(np.clip(credit_score / 850.0, 0.0, 1.0))


# ---------------------------------------------------------------------------
# GROUP 8 — Seasonality (w8)
# ---------------------------------------------------------------------------

def compute_seasonal_demand_cv(demand_series: List[float]) -> float:
    """Seasonal Demand Coefficient of Variation (SDCV).

    SDCV = std(demand) / mean(demand), clipped to [0, 1].

    Parameters
    ----------
    demand_series : list of float
        Periodic demand observations (e.g. monthly).

    Returns
    -------
    float
        Demand CV in [0.0, 1.0].
    """
    arr = np.asarray(demand_series, dtype=float)
    if len(arr) == 0:
        return 0.0
    mean = float(np.mean(arr))
    if mean == 0:
        return 0.0
    cv = float(np.std(arr)) / mean
    return float(np.clip(cv, 0.0, 1.0))


def compute_industry_seasonality_index(seasonal_swing_pct: float) -> float:
    """Industry Seasonality Index (ISI).

    ISI = min(swing / 100.0, 1.0).

    Parameters
    ----------
    seasonal_swing_pct : float
        Percentage swing in industry demand across seasons.

    Returns
    -------
    float
        Seasonality index in [0.0, 1.0].
    """
    return float(np.clip(seasonal_swing_pct / 100.0, 0.0, 1.0))


def compute_climate_event_impact(event_driven_revenue_pct: float) -> float:
    """Climate / Weather Event Impact (CEI).

    CEI = event_driven_revenue_pct, clipped to [0, 1].

    Parameters
    ----------
    event_driven_revenue_pct : float
        Fraction of revenue attributable to climate/weather events (0–1).

    Returns
    -------
    float
        Climate event impact in [0.0, 1.0].
    """
    return float(np.clip(event_driven_revenue_pct, 0.0, 1.0))


# ---------------------------------------------------------------------------
# ExternalFactorComputer — convenience wrapper
# ---------------------------------------------------------------------------

class ExternalFactorComputer:
    """Wraps all 24 external factor computation functions.

    Call :meth:`compute_all` with a single ``data`` dict to obtain every
    external factor in one shot.
    """

    @staticmethod
    def compute_all(data: Dict[str, Union[float, List[float]]]) -> Dict[str, float]:
        """Compute all external factors from a single data dictionary.

        Parameters
        ----------
        data : dict
            Expected keys (all optional — missing keys are gracefully
            skipped and the corresponding outputs will be absent):

            **Group 1 – Demand Weight (w1)**
            * ``price_series`` — for market volatility
            * ``churned_customers``, ``total_customers`` — for churn rate
            * ``actual_demand``, ``forecast_demand`` — for forecast error

            **Group 2 – Stock Level (w2)**
            * ``used_capacity``, ``total_capacity`` — for warehouse util
            * ``current_assets``, ``current_liabilities`` — for cash flow
            * ``cogs``, ``avg_inventory`` — for inventory turnover

            **Group 3 – Lead Time (w3)**
            * ``lpi_score`` — for supply disruption index
            * ``imported_units``, ``total_units`` — for import dependency
            * ``gpr_index`` — for geopolitical risk

            **Group 4 – Profit Margin (w4)**
            * ``competitor_price``, ``your_price`` — for price pressure
            * ``pct_demand_change``, ``pct_price_change`` — for elasticity
            * ``industry_margin``, ``your_margin`` — for benchmark gap

            **Group 5 – Stockout Cost (w5)**
            * ``hhi_score`` — for market competition
            * ``switching_ease_rate`` — for switching cost
            * ``nps_score``, ``repeat_purchase_rate`` — for brand loyalty

            **Group 6 – Holding Cost (w6)**
            * ``central_bank_rate`` — for interest rate factor
            * ``current_storage_rate``, ``benchmark_storage_rate`` — SCI
            * ``expired_units``, ``total_held`` — for perishability

            **Group 7 – Supplier (w7)**
            * ``top_supplier_units``, ``total_supplier_units`` — SCR
            * ``lpi_score`` — for global supply volatility (shared key)
            * ``credit_score`` — for supplier financial health

            **Group 8 – Seasonality (w8)**
            * ``demand_series`` — for seasonal demand CV
            * ``seasonal_swing_pct`` — for industry seasonality
            * ``event_driven_revenue_pct`` — for climate event impact

        Returns
        -------
        dict
            Flat dictionary mapping factor abbreviations to their values.
        """
        result: Dict[str, float] = {}

        # --- Group 1: Demand Weight Factors (w1) ---
        if "price_series" in data:
            result["MV"] = compute_market_volatility(data["price_series"])

        if "churned_customers" in data and "total_customers" in data:
            result["CCR"] = compute_churn_rate(
                data["churned_customers"], data["total_customers"],
            )

        if "actual_demand" in data and "forecast_demand" in data:
            result["DFE"] = compute_forecast_error(
                data["actual_demand"], data["forecast_demand"],
            )

        # --- Group 2: Stock Level (w2) ---
        if "used_capacity" in data and "total_capacity" in data:
            result["WU"] = compute_warehouse_utilization(
                data["used_capacity"], data["total_capacity"],
            )

        if "current_assets" in data and "current_liabilities" in data:
            result["CFP"] = compute_cash_flow_pressure(
                data["current_assets"], data["current_liabilities"],
            )

        if "cogs" in data and "avg_inventory" in data:
            result["ITR"] = compute_inventory_turnover(
                data["cogs"], data["avg_inventory"],
            )

        # --- Group 3: Lead Time (w3) ---
        if "lpi_score" in data:
            result["SCDI"] = compute_supply_disruption_index(data["lpi_score"])

        if "imported_units" in data and "total_units" in data:
            result["IDR"] = compute_import_dependency(
                data["imported_units"], data["total_units"],
            )

        if "gpr_index" in data:
            result["GRI"] = compute_geopolitical_risk(data["gpr_index"])

        # --- Group 4: Profit Margin (w4) ---
        if "competitor_price" in data and "your_price" in data:
            result["CPP"] = compute_competitive_price_pressure(
                data["competitor_price"], data["your_price"],
            )

        if "pct_demand_change" in data and "pct_price_change" in data:
            result["PED"] = compute_price_elasticity(
                data["pct_demand_change"], data["pct_price_change"],
            )

        if "industry_margin" in data and "your_margin" in data:
            result["IBG"] = compute_industry_benchmark_gap(
                data["industry_margin"], data["your_margin"],
            )

        # --- Group 5: Stockout Cost (w5) ---
        if "hhi_score" in data:
            result["MCI"] = compute_market_competition_index(data["hhi_score"])

        if "switching_ease_rate" in data:
            result["CSC"] = compute_switching_cost_index(
                data["switching_ease_rate"],
            )

        if "nps_score" in data and "repeat_purchase_rate" in data:
            result["BLI"] = compute_brand_loyalty_index(
                data["nps_score"], data["repeat_purchase_rate"],
            )

        # --- Group 6: Holding Cost (w6) ---
        if "central_bank_rate" in data:
            result["IR"] = compute_interest_rate_factor(data["central_bank_rate"])

        if "current_storage_rate" in data and "benchmark_storage_rate" in data:
            result["SCI"] = compute_storage_cost_index(
                data["current_storage_rate"], data["benchmark_storage_rate"],
            )

        if "expired_units" in data and "total_held" in data:
            result["PPR"] = compute_perishability_rate(
                data["expired_units"], data["total_held"],
            )

        # --- Group 7: Supplier (w7) ---
        if "top_supplier_units" in data and "total_supplier_units" in data:
            result["SCR"] = compute_supplier_concentration(
                data["top_supplier_units"], data["total_supplier_units"],
            )

        if "lpi_score" in data:
            result["GSCV"] = compute_global_supply_volatility(data["lpi_score"])

        if "credit_score" in data:
            result["SFH"] = compute_supplier_financial_health(data["credit_score"])

        # --- Group 8: Seasonality (w8) ---
        if "demand_series" in data:
            result["SDCV"] = compute_seasonal_demand_cv(data["demand_series"])

        if "seasonal_swing_pct" in data:
            result["ISI"] = compute_industry_seasonality_index(
                data["seasonal_swing_pct"],
            )

        if "event_driven_revenue_pct" in data:
            result["CEI"] = compute_climate_event_impact(
                data["event_driven_revenue_pct"],
            )

        return result
