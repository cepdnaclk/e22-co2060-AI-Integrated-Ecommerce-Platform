"""
Variable computation module for the Restock Priority ML system.

Implements 8 core variable computation functions used to derive
features for restock priority scoring.
"""

from typing import Dict, List, Optional, Tuple, Union

import numpy as np


def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Return numerator / denominator, or *default* when denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator


# ---------------------------------------------------------------------------
# 1. Demand Rate
# ---------------------------------------------------------------------------

def compute_demand_rate(
    total_units_sold: float,
    days: int,
    sales_history: Optional[List[float]] = None,
    window: int = 7,
) -> Dict[str, float]:
    """Compute demand rate and optionally a weighted moving average.

    Parameters
    ----------
    total_units_sold : float
        Cumulative units sold over the period.
    days : int
        Number of days in the period.
    sales_history : list of float, optional
        Daily sales figures for weighted moving average calculation.
    window : int
        Window size for the weighted moving average (default 7).

    Returns
    -------
    dict
        ``demand_rate``  – D = Total_Units_Sold / days
        ``weighted_moving_avg`` – WMA over the last *window* entries of
        *sales_history* (``None`` when history is not provided).
    """
    demand_rate = _safe_div(total_units_sold, days)

    weighted_moving_avg: Optional[float] = None
    if sales_history is not None and len(sales_history) > 0:
        series = np.array(sales_history[-window:], dtype=float)
        weights = np.arange(1, len(series) + 1, dtype=float)
        weighted_moving_avg = float(np.dot(series, weights) / weights.sum())

    return {
        "demand_rate": demand_rate,
        "weighted_moving_avg": weighted_moving_avg,
    }


# ---------------------------------------------------------------------------
# 2. Stock Level
# ---------------------------------------------------------------------------

def compute_stock_level(
    units_on_hand: float,
    demand_rate: float,
    lead_time: float,
    safety_stock: float,
) -> Dict[str, float]:
    """Compute days-of-supply and reorder point.

    Parameters
    ----------
    units_on_hand : float
        Current inventory on hand.
    demand_rate : float
        Average units sold per day.
    lead_time : float
        Supplier lead time in days.
    safety_stock : float
        Safety-stock buffer in units.

    Returns
    -------
    dict
        ``days_of_supply`` – units_on_hand / demand_rate
        ``reorder_point``  – (demand_rate * lead_time) + safety_stock
    """
    days_of_supply = _safe_div(units_on_hand, demand_rate, default=float("inf"))
    reorder_point = (demand_rate * lead_time) + safety_stock

    return {
        "days_of_supply": days_of_supply,
        "reorder_point": reorder_point,
    }


# ---------------------------------------------------------------------------
# 3. Lead Time
# ---------------------------------------------------------------------------

def compute_lead_time(
    lead_time_history: List[float],
    z_score: float = 1.65,
) -> Dict[str, float]:
    """Compute adjusted lead time from historical observations.

    Parameters
    ----------
    lead_time_history : list of float
        Historical lead-time observations (days).
    z_score : float
        Z-score for the desired service level (default 1.65 ≈ 95 %).

    Returns
    -------
    dict
        ``lead_time_avg``      – L_avg = mean(lead_time_history)
        ``lead_time_std``      – sigma_L = std(lead_time_history)
        ``lead_time_adjusted`` – L_adj = L_avg + (z_score * sigma_L)
    """
    arr = np.array(lead_time_history, dtype=float)
    l_avg = float(np.mean(arr)) if len(arr) > 0 else 0.0
    sigma_l = float(np.std(arr)) if len(arr) > 0 else 0.0
    l_adj = l_avg + (z_score * sigma_l)

    return {
        "lead_time_avg": l_avg,
        "lead_time_std": sigma_l,
        "lead_time_adjusted": l_adj,
    }


# ---------------------------------------------------------------------------
# 4. Profit Margin
# ---------------------------------------------------------------------------

def compute_profit_margin(
    selling_price: float,
    variable_cost: float,
    cogs: float,
) -> Dict[str, float]:
    """Compute contribution margin and gross margin percentages.

    Parameters
    ----------
    selling_price : float
        Unit selling price (SP).
    variable_cost : float
        Unit variable cost (VC).
    cogs : float
        Cost of goods sold per unit (COGS).

    Returns
    -------
    dict
        ``contribution_margin`` – (SP - VC) / SP * 100
        ``gross_margin``        – (SP - COGS) / SP * 100
    """
    contribution_margin = _safe_div(selling_price - variable_cost, selling_price) * 100
    gross_margin = _safe_div(selling_price - cogs, selling_price) * 100

    return {
        "contribution_margin": contribution_margin,
        "gross_margin": gross_margin,
    }


# ---------------------------------------------------------------------------
# 5. Stockout Cost
# ---------------------------------------------------------------------------

def compute_stockout_cost(
    price: float,
    cost: float,
    q_lost: float,
    backorder_cost: float,
    q_backordered: float,
    goodwill_loss: float,
) -> Dict[str, float]:
    """Compute total stockout cost.

    SC = (price - cost) * q_lost + backorder_cost * q_backordered + goodwill_loss

    Parameters
    ----------
    price : float
        Unit selling price.
    cost : float
        Unit cost.
    q_lost : float
        Quantity of lost sales.
    backorder_cost : float
        Cost per backordered unit.
    q_backordered : float
        Quantity backordered.
    goodwill_loss : float
        Estimated goodwill / reputation loss.

    Returns
    -------
    dict
        ``stockout_cost`` – total stockout cost.
    """
    sc = (price - cost) * q_lost + backorder_cost * q_backordered + goodwill_loss
    return {"stockout_cost": sc}


# ---------------------------------------------------------------------------
# 6. Holding Cost
# ---------------------------------------------------------------------------

def compute_holding_cost(
    unit_cost: float,
    holding_rate: float = 0.25,
    avg_inventory: Optional[float] = None,
) -> Dict[str, float]:
    """Compute per-unit and total holding cost.

    Parameters
    ----------
    unit_cost : float
        Cost per unit.
    holding_rate : float
        Annual holding cost as a fraction of unit cost (default 0.25).
    avg_inventory : float, optional
        Average inventory level.  When provided the total holding cost
        is calculated as avg_inventory * unit_cost * holding_rate.

    Returns
    -------
    dict
        ``holding_cost_per_unit`` – unit_cost * holding_rate
        ``holding_cost_total``    – avg_inventory * unit_cost * holding_rate
        (``None`` when *avg_inventory* is not supplied).
    """
    hc_per_unit = unit_cost * holding_rate

    hc_total: Optional[float] = None
    if avg_inventory is not None:
        hc_total = avg_inventory * unit_cost * holding_rate

    return {
        "holding_cost_per_unit": hc_per_unit,
        "holding_cost_total": hc_total,
    }


# ---------------------------------------------------------------------------
# 7. Supplier Reliability
# ---------------------------------------------------------------------------

def compute_supplier_reliability(
    on_time_deliveries: int,
    total_orders: int,
    units_delivered: float,
    units_ordered: float,
    quality_pass_rate: float,
    weights: Tuple[float, float, float] = (0.4, 0.4, 0.2),
) -> Dict[str, float]:
    """Compute composite supplier reliability score.

    SR_score = w1 * OTD + w2 * FR + w3 * QR
    SR_failure = 1 - SR_score

    Parameters
    ----------
    on_time_deliveries : int
        Number of deliveries received on time.
    total_orders : int
        Total number of orders placed.
    units_delivered : float
        Total units actually delivered.
    units_ordered : float
        Total units ordered.
    quality_pass_rate : float
        Fraction of units passing quality inspection (0-1).
    weights : tuple of float
        (w1, w2, w3) weights for OTD, fill-rate, and quality respectively.

    Returns
    -------
    dict
        ``on_time_delivery_rate`` – OTD = on_time / total
        ``fill_rate``             – FR  = delivered / ordered
        ``supplier_reliability_score``   – SR_score
        ``supplier_reliability_failure`` – 1 - SR_score
    """
    otd = _safe_div(on_time_deliveries, total_orders)
    fr = _safe_div(units_delivered, units_ordered)
    w1, w2, w3 = weights
    sr_score = w1 * otd + w2 * fr + w3 * quality_pass_rate
    sr_failure = 1.0 - sr_score

    return {
        "on_time_delivery_rate": otd,
        "fill_rate": fr,
        "supplier_reliability_score": sr_score,
        "supplier_reliability_failure": sr_failure,
    }


# ---------------------------------------------------------------------------
# 8. Seasonality Index
# ---------------------------------------------------------------------------

def compute_seasonality_index(
    demand_by_period: Dict[str, float],
) -> Dict[str, float]:
    """Compute seasonality indices per period.

    SE_t = D_avg_t / ( (1/T) * SUM(D_avg_t) )

    Parameters
    ----------
    demand_by_period : dict
        Mapping of period label to average demand for that period.

    Returns
    -------
    dict
        Mapping of period label to its seasonality index.
    """
    if not demand_by_period:
        return {}

    values = np.array(list(demand_by_period.values()), dtype=float)
    t = len(values)
    overall_avg = _safe_div(float(values.sum()), t)

    result: Dict[str, float] = {}
    for label, avg_demand in demand_by_period.items():
        result[label] = _safe_div(avg_demand, overall_avg, default=0.0)

    return result


# ---------------------------------------------------------------------------
# VariableComputer – convenience wrapper
# ---------------------------------------------------------------------------

class VariableComputer:
    """Wraps all 8 core variable computation functions.

    Call :meth:`compute_all` with a single ``sku_data`` dict to obtain
    every raw variable in one shot.
    """

    @staticmethod
    def compute_all(sku_data: Dict) -> Dict[str, Union[float, None, Dict]]:
        """Compute all raw variables for a single SKU.

        Parameters
        ----------
        sku_data : dict
            Expected keys (all optional – missing keys are gracefully
            skipped and the corresponding outputs will be absent):

            * ``total_units_sold``, ``days`` – for demand rate
            * ``sales_history``, ``window`` – optional, for WMA
            * ``units_on_hand``, ``safety_stock`` – for stock level
            * ``lead_time_history`` – for lead-time stats
            * ``selling_price``, ``variable_cost``, ``cogs`` – for margins
            * ``price``, ``cost``, ``q_lost``, ``backorder_cost``,
              ``q_backordered``, ``goodwill_loss`` – for stockout cost
            * ``unit_cost``, ``holding_rate``, ``avg_inventory`` – for
              holding cost
            * ``on_time_deliveries``, ``total_orders``,
              ``units_delivered``, ``units_ordered``,
              ``quality_pass_rate``, ``weights`` – for supplier reliability
            * ``demand_by_period`` – for seasonality index

        Returns
        -------
        dict
            Flat dictionary of all computed variables.
        """
        result: Dict[str, Union[float, None, Dict]] = {}

        # 1. Demand Rate
        if "total_units_sold" in sku_data and "days" in sku_data:
            dr = compute_demand_rate(
                total_units_sold=sku_data["total_units_sold"],
                days=sku_data["days"],
                sales_history=sku_data.get("sales_history"),
                window=sku_data.get("window", 7),
            )
            result.update(dr)

        # 2. Stock Level (needs demand_rate from step 1 or sku_data)
        demand_rate = result.get("demand_rate", sku_data.get("demand_rate"))
        lead_time = sku_data.get("lead_time")
        # Derive lead_time from history if not explicitly provided
        if lead_time is None and "lead_time_history" in sku_data:
            lt = compute_lead_time(
                lead_time_history=sku_data["lead_time_history"],
                z_score=sku_data.get("z_score", 1.65),
            )
            result.update(lt)
            lead_time = lt["lead_time_adjusted"]
        elif "lead_time_history" in sku_data:
            # 3. Lead Time (compute even if lead_time was given)
            lt = compute_lead_time(
                lead_time_history=sku_data["lead_time_history"],
                z_score=sku_data.get("z_score", 1.65),
            )
            result.update(lt)

        if (
            "units_on_hand" in sku_data
            and demand_rate is not None
            and lead_time is not None
        ):
            sl = compute_stock_level(
                units_on_hand=sku_data["units_on_hand"],
                demand_rate=demand_rate,
                lead_time=lead_time,
                safety_stock=sku_data.get("safety_stock", 0.0),
            )
            result.update(sl)

        # 4. Profit Margin
        if all(
            k in sku_data for k in ("selling_price", "variable_cost", "cogs")
        ):
            pm = compute_profit_margin(
                selling_price=sku_data["selling_price"],
                variable_cost=sku_data["variable_cost"],
                cogs=sku_data["cogs"],
            )
            result.update(pm)

        # 5. Stockout Cost
        sc_keys = (
            "price", "cost", "q_lost",
            "backorder_cost", "q_backordered", "goodwill_loss",
        )
        if all(k in sku_data for k in sc_keys):
            sc = compute_stockout_cost(
                price=sku_data["price"],
                cost=sku_data["cost"],
                q_lost=sku_data["q_lost"],
                backorder_cost=sku_data["backorder_cost"],
                q_backordered=sku_data["q_backordered"],
                goodwill_loss=sku_data["goodwill_loss"],
            )
            result.update(sc)

        # 6. Holding Cost
        if "unit_cost" in sku_data:
            hc = compute_holding_cost(
                unit_cost=sku_data["unit_cost"],
                holding_rate=sku_data.get("holding_rate", 0.25),
                avg_inventory=sku_data.get("avg_inventory"),
            )
            result.update(hc)

        # 7. Supplier Reliability
        sr_keys = (
            "on_time_deliveries", "total_orders",
            "units_delivered", "units_ordered", "quality_pass_rate",
        )
        if all(k in sku_data for k in sr_keys):
            sr = compute_supplier_reliability(
                on_time_deliveries=sku_data["on_time_deliveries"],
                total_orders=sku_data["total_orders"],
                units_delivered=sku_data["units_delivered"],
                units_ordered=sku_data["units_ordered"],
                quality_pass_rate=sku_data["quality_pass_rate"],
                weights=sku_data.get("weights", (0.4, 0.4, 0.2)),
            )
            result.update(sr)

        # 8. Seasonality Index
        if "demand_by_period" in sku_data:
            si = compute_seasonality_index(
                demand_by_period=sku_data["demand_by_period"],
            )
            result["seasonality_index"] = si

        return result
