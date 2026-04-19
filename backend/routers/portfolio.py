import numpy as np
import pandas as pd
import yfinance as yf
from routers.configs import RISK_FREE_RATE, MONTE_CARLO_SIMS
from routers.stock import fetch, rule_score, train_ml_models, StackingEnsemble
from routers.quiz import run_quiz


EQUITY_LARGE_CAP = {
    "RELIANCE":   "Reliance Industries",
    "TCS":        "Tata Consultancy Services",
    "HDFCBANK":   "HDFC Bank",
    "INFY":       "Infosys",
    "HINDUNILVR": "Hindustan Unilever",
    "ICICIBANK":  "ICICI Bank",
    "MARUTI":     "Maruti Suzuki",
    "NESTLEIND":  "Nestle India",
}

EQUITY_MID_SMALL = {
    "PERSISTENT": "Persistent Systems",
    "POLICYBZR":  "PB Fintech",
    "NYKAA":      "FSN E-Commerce (Nykaa)",
    "IRCTC":      "IRCTC",
}

DEBT_INSTRUMENTS = {
    "LIQUIDBEES": "Nippon Liquid ETF (Debt proxy)",
    "CPSEETF":    "CPSE ETF (PSU Bonds proxy)",
}

GOLD_INSTRUMENTS = {
    "GOLDBEES":   "Nippon Gold ETF",
    "SGBMAR29":   "Sovereign Gold Bond 2029",
}


PROFILE_CONFIG = {
    "Conservative": {
        "equity_pool":  EQUITY_LARGE_CAP,
        "equity_picks": 2,
        "debt_pool":    DEBT_INSTRUMENTS,
        "debt_picks":   2,
        "gold_pool":    GOLD_INSTRUMENTS,
        "gold_picks":   1,
    },
    "Balanced": {
        "equity_pool":  {**EQUITY_LARGE_CAP, **EQUITY_MID_SMALL},
        "equity_picks": 4,
        "debt_pool":    DEBT_INSTRUMENTS,
        "debt_picks":   1,
        "gold_pool":    GOLD_INSTRUMENTS,
        "gold_picks":   1,
    },
    "Growth": {
        "equity_pool":  {**EQUITY_LARGE_CAP, **EQUITY_MID_SMALL},
        "equity_picks": 5,
        "debt_pool":    DEBT_INSTRUMENTS,
        "debt_picks":   1,
        "gold_pool":    GOLD_INSTRUMENTS,
        "gold_picks":   1,
    },
    "Aggressive": {
        "equity_pool":  {**EQUITY_LARGE_CAP, **EQUITY_MID_SMALL},
        "equity_picks": 6,
        "debt_pool":    DEBT_INSTRUMENTS,
        "debt_picks":   1,
        "gold_pool":    GOLD_INSTRUMENTS,
        "gold_picks":   1,
    },
}



def pick_equity(pool,n, sector_map):
    stock_data = {}
    for ticker in pool:
        df = fetch(ticker)
        if df is not None:
            stock_data[ticker] = df

    if not stock_data:
        return list(pool.keys())[:n]

    rule_results = {
        t: rule_score(t, sector_map.get(t, "Unknown"), df)
        for t, df in stock_data.items()
    }

    ml_results = train_ml_models(stock_data)

    ensemble = StackingEnsemble()
    try:
        meta_X, meta_y = ensemble.build_meta_dataset(
            stock_data, ml_results, rule_results
        )
        if len(meta_X) > 50 and meta_y.nunique() > 1:
            ensemble.fit(meta_X, meta_y)
    except Exception:
        pass  # falls back to 0.4/0.6 inside fused_score

    fused = {}
    for t in stock_data:
        r_s = rule_results[t]["rule_score"]
        m_s = ml_results[t]["ml_score"] if t in ml_results else 0.0
        fused[t] = ensemble.fused_score(r_s, m_s)

    # Sort by fused score, pick top-n
    ranked = sorted(fused.items(), key=lambda x: -x[1])
    return [t for t, _ in ranked[:n]]


# ── Step 2: Fetch historical returns for allocation math ──────────────────────

def fetch_returns(tickers,period = "1y"):
    """Download adjusted close and return daily pct_change matrix."""
    raw = yf.download(
        [f"{t}.NS" for t in tickers],
        period=period,
        auto_adjust=True,
        progress=False,
    )["Close"]

    # Flatten column names if multi-level
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = [col[0].replace(".NS", "") for col in raw.columns]
    else:
        raw.columns = [c.replace(".NS", "") for c in raw.columns]

    return raw.pct_change().dropna()


# ── Step 3: Monte Carlo simulation ───────────────────────────────────────────

def monte_carlo(
    weights:      np.ndarray,
    mean_returns: np.ndarray,
    cov_matrix:   np.ndarray,
    days:         int  = 252,
    sims:         int  = MONTE_CARLO_SIMS,
    initial:      float = 10_000,
) -> dict:
    """
    Simulate `sims` portfolio paths over `days` trading days.
    Returns distribution stats used by the Loss Probability Meter
    and the What Would ₹500 Do feature.
    """
    results = np.zeros(sims)

    L = np.linalg.cholesky(cov_matrix + np.eye(len(weights)) * 1e-8)

    for i in range(sims):
        random_shocks = np.random.randn(len(weights), days)
        daily_rets = mean_returns[:, None] + L @ random_shocks  
        port_rets = weights @ daily_rets 
        results[i] = initial * np.exp(np.sum(np.log(1 + port_rets)))

    final_values = results
    returns_pct  = (final_values - initial) / initial * 100

    return {
        "initial":          initial,
        "median":           round(float(np.median(final_values)), 2),
        "mean":             round(float(np.mean(final_values)), 2),
        "p10":              round(float(np.percentile(final_values, 10)), 2),
        "p90":              round(float(np.percentile(final_values, 90)), 2),
        "loss_probability": round(float(np.mean(final_values < initial) * 100), 1),
        "best_case":        round(float(np.percentile(final_values, 95)), 2),
        "worst_case":       round(float(np.percentile(final_values, 5)), 2),
        "raw_returns_pct":  returns_pct.tolist(), 
    }


def health_score(
    weights:      np.ndarray,
    returns_df:   pd.DataFrame,
    profile:      dict,
) -> dict:
    """
    Score 0–100 across 3 dimensions:
      - Diversification  (how spread across assets)
      - Risk-adjusted return  (Sharpe ratio, normalised)
      - Time horizon alignment  (volatility vs stated horizon)
    """
    # Diversification: 1 - HHI (Herfindahl index). 1.0 = perfect spread
    hhi            = float(np.sum(weights ** 2))
    diversify_raw  = 1 - hhi
    diversify_score = round(diversify_raw * 100, 1)

    # Sharpe
    port_ret   = returns_df.values @ weights
    ann_ret    = float(np.mean(port_ret) * 252)
    ann_vol    = float(np.std(port_ret)  * np.sqrt(252))
    sharpe     = (ann_ret - RISK_FREE_RATE) / (ann_vol + 1e-9)
    sharpe_score = round(float(np.clip(sharpe / 2.0, 0, 1) * 100), 1)

    # Time horizon alignment
    horizon_years  = {1: 1, 2: 2, 3: 4, 4: 8}   # maps quiz score bucket to years
    quiz_score     = profile.get("total_score", 10)
    target_horizon = horizon_years.get(min(quiz_score // 5 + 1, 4), 4)
    # Low vol portfolios score well on short horizon; high vol need long horizon
    ideal_vol      = 0.10 + (target_horizon * 0.03)
    horizon_score  = round(
        float(np.clip(1 - abs(ann_vol - ideal_vol) / 0.3, 0, 1) * 100), 1
    )

    overall = round((diversify_score + sharpe_score + horizon_score) / 3, 1)

    return {
        "overall":      overall,
        "diversification": diversify_score,
        "risk_adjusted":   sharpe_score,
        "horizon_fit":     horizon_score,
        "annual_return":   round(ann_ret * 100, 2),
        "annual_vol":      round(ann_vol * 100, 2),
        "sharpe":          round(sharpe, 3),
    }


# ── Step 5: What Would ₹X Do ─────────────────────────────────────────────────

def what_would_x_do(mc_result: dict, amount: float) -> dict:
    """
    Scale Monte Carlo results to any investment amount.
    Returns 3 plain-language rupee scenarios — no percentages.
    """
    scale = amount / mc_result["initial"]
    return {
        "amount":    amount,
        "safe":      round(mc_result["p10"]    * scale, 2),   # 10th percentile
        "moderate":  round(mc_result["median"] * scale, 2),   # 50th percentile
        "optimistic":round(mc_result["p90"]    * scale, 2),   # 90th percentile
        "loss_prob": mc_result["loss_probability"],
    }


# ── Main Builder ──────────────────────────────────────────────────────────────

def build_portfolio(profile: dict, investment_amount: float = 10_000) -> dict:
    """
    Full pipeline:
      profile dict (from quiz.py) → named portfolio with allocations,
      Monte Carlo projections, health score, and ₹X scenarios.
    """
    profile_name = profile["profile"]
    config       = PROFILE_CONFIG[profile_name]

    sector_map = {
        **{t: "Large Cap Equity" for t in EQUITY_LARGE_CAP},
        **{t: "Mid/Small Equity" for t in EQUITY_MID_SMALL},
        **{t: "Debt"             for t in DEBT_INSTRUMENTS},
        **{t: "Gold"             for t in GOLD_INSTRUMENTS},
    }

    equity_tickers = pick_equity(
        config["equity_pool"],
        config["equity_picks"],
        sector_map,
    )

    debt_tickers = list(config["debt_pool"].keys())[:config["debt_picks"]]
    gold_tickers = list(config["gold_pool"].keys())[:config["gold_picks"]]

    all_tickers = equity_tickers + debt_tickers + gold_tickers

    returns_df = fetch_returns(all_tickers)

    all_tickers = [t for t in all_tickers if t in returns_df.columns]
    returns_df  = returns_df[all_tickers].dropna(axis=1)
    all_tickers = returns_df.columns.tolist()

    if not all_tickers:
        raise ValueError("No valid return data fetched. Check your internet connection.")

    n = len(all_tickers)

    n_eq   = len([t for t in all_tickers if t in equity_tickers])
    n_debt = len([t for t in all_tickers if t in debt_tickers])
    n_gold = len([t for t in all_tickers if t in gold_tickers])

    eq_pct   = profile["equity_pct"] / 100
    debt_pct = profile["debt_pct"]   / 100
    gold_pct = profile["gold_pct"]   / 100

    weights = []
    for t in all_tickers:
        if t in equity_tickers:
            weights.append(eq_pct   / max(n_eq,   1))
        elif t in debt_tickers:
            weights.append(debt_pct / max(n_debt, 1))
        else:
            weights.append(gold_pct / max(n_gold, 1))

    weights = np.array(weights)
    weights /= weights.sum()  # normalise to exactly 1.0

    mean_returns = returns_df.mean().values
    cov_matrix   = returns_df.cov().values

    mc = monte_carlo(weights, mean_returns, cov_matrix, initial=investment_amount)
    health = health_score(weights, returns_df, profile)
    scenarios = what_would_x_do(mc, investment_amount)
    name_map = {
        **EQUITY_LARGE_CAP,
        **EQUITY_MID_SMALL,
        **DEBT_INSTRUMENTS,
        **GOLD_INSTRUMENTS,
    }

    holdings = []
    for t, w in zip(all_tickers, weights):
        holdings.append({
            "ticker":     t,
            "name":       name_map.get(t, t),
            "weight":     round(float(w) * 100, 2),
            "rupees":     round(float(w) * investment_amount, 2),
            "asset_class": (
                "Equity" if t in equity_tickers else
                "Debt"   if t in debt_tickers   else
                "Gold"
            ),
        })

    holdings.sort(key=lambda x: -x["weight"])

    return {
        "profile":     profile_name,
        "amount":      investment_amount,
        "holdings":    holdings,
        "monte_carlo": mc,
        "health":      health,
        "scenarios":   scenarios,
    }


if __name__ == "__main__":
    profile = run_quiz()
    amount  = float(input("How much do you want to invest (₹)? ").strip())
    result  = build_portfolio(profile, investment_amount=amount)