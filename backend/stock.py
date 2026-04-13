"""
stock.py — NSE Portfolio Allocation Engine
==========================================
Pipeline:
  1. Fetch 1yr of OHLCV data from Yahoo Finance
  2. Rule-based scoring  (RSI, MA, MACD, Bollinger, volume)
  3. XGBoost signal      (trained per-ticker on historical labels)
  4. SHAP explanations   (top drivers per stock)
  5. Stacking ensemble   (LogisticRegression learns rule vs ML weight)
  6. Risk-parity allocation on fused score
  7. Diversification warnings
"""

import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import yfinance as yf
import xgboost as xgb
import shap

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import classification_report

# ── Config ────────────────────────────────────────────────────────────────────

STOCKS: dict[str, str] = {
    "RELIANCE":   "Energy",
    "TCS":        "IT",
    "HDFCBANK":   "Banking",
    "INFY":       "IT",
    "WIPRO":      "IT",
    "ICICIBANK":  "Banking",
    "HINDUNILVR": "FMCG",
    "BAJFINANCE": "Finance",
    "SBIN":       "Banking",
    "MARUTI":     "Auto",
}

PERIOD            = "1y"        # data window for training
HORIZON           = 21          # forward-return label horizon (trading days)
RISK_FREE_ANNUAL  = 0.068       # RBI repo rate proxy
RISK_FREE_DAILY   = RISK_FREE_ANNUAL / 252
MIN_ROWS          = 120         # minimum rows needed to train
MAX_SECTOR_PCT    = 40.0        # diversification warning threshold

# ── 1. Data Fetching ──────────────────────────────────────────────────────────

def fetch(ticker: str, period: str = PERIOD) -> pd.DataFrame | None:
    """Download adjusted OHLCV for an NSE ticker. Returns None if insufficient."""
    df = yf.download(
        f"{ticker}.NS",
        period=period,
        progress=False,
        auto_adjust=True,
    )
    if len(df) < MIN_ROWS:
        return None
    if df is None or df.empty:
        return None
    return df


# ── 2. Technical Indicators ───────────────────────────────────────────────────

def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain  = delta.clip(lower=0).rolling(period).mean()
    loss  = -delta.clip(upper=0).rolling(period).mean()
    rs    = gain / (loss + 1e-9)
    return 100 - (100 / (1 + rs))


def build_features(close: pd.Series, volume: pd.Series) -> pd.DataFrame:
    """
    Build a feature matrix from price + volume.
    All features are relative/ratio-based so they generalise across price levels.
    """
    df = pd.DataFrame(index=close.index)

    # ── Trend ─────────────────────────────────────────────
    df["ma7"]        = close.rolling(7).mean()
    df["ma21"]       = close.rolling(21).mean()
    df["ma30"]       = close.rolling(30).mean()
    df["ma50"]       = close.rolling(50).mean()
    df["ma_ratio_s"] = df["ma7"]  / df["ma21"]     # short-term trend strength
    df["ma_ratio_l"] = df["ma21"] / df["ma50"]     # long-term trend strength

    # ── MACD ──────────────────────────────────────────────
    ema12            = close.ewm(span=12).mean()
    ema26            = close.ewm(span=26).mean()
    df["macd"]       = ema12 - ema26
    df["macd_sig"]   = df["macd"].ewm(span=9).mean()
    df["macd_hist"]  = df["macd"] - df["macd_sig"]
    df["macd_cross"] = (df["macd_hist"] > 0).astype(int)  # 1 = bullish crossover zone

    # ── Momentum ──────────────────────────────────────────
    df["rsi"]        = _rsi(close)
    df["roc_5"]      = close.pct_change(5)
    df["roc_10"]     = close.pct_change(10)
    df["roc_21"]     = close.pct_change(21)

    # ── Volatility ────────────────────────────────────────
    ret              = close.pct_change()
    df["vol_7"]      = ret.rolling(7).std()
    df["vol_21"]     = ret.rolling(21).std()
    df["vol_ratio"]  = df["vol_7"] / (df["vol_21"] + 1e-9)   # rising = unstable regime

    # ── Bollinger Band Position ───────────────────────────
    bb_mid           = close.rolling(20).mean()
    bb_std           = close.rolling(20).std()
    df["bb_pos"]     = (close - bb_mid) / (2 * bb_std + 1e-9)  # -1 to +1

    # ── Volume ────────────────────────────────────────────
    df["vol_ma7"]    = volume.rolling(7).mean()
    df["vol_ma21"]   = volume.rolling(21).mean()
    df["vol_surge"]  = volume / (df["vol_ma7"] + 1e-9)         # > 1.5 = unusual
    df["vol_trend"]  = df["vol_ma7"] / (df["vol_ma21"] + 1e-9) # rising volume trend

    # ── Price Position ────────────────────────────────────
    high52           = close.rolling(252, min_periods=60).max()
    low52            = close.rolling(252, min_periods=60).min()
    df["pct_from_high"] = (close - high52) / (high52 + 1e-9)
    df["pct_from_low"]  = (close - low52)  / (low52  + 1e-9)

    return df.dropna()


def make_labels(close: pd.Series, horizon: int = HORIZON) -> pd.Series:
    """
    Label each day by its forward return over `horizon` trading days.
      2 = Strong Buy   (fwd return > +4%)
      1 = Buy          (fwd return > +1.5%)
      0 = Hold         (-1.5% to +1.5%)
     -1 = Sell         (fwd return < -1.5%)
    """
    fwd = close.shift(-horizon) / close - 1
    labels = pd.Series(0, index=close.index, dtype=int)
    labels[fwd >  0.04]  =  2
    labels[fwd >  0.015] =  1
    labels[fwd < -0.015] = -1
    return labels


# ── 3. Rule-Based Scorer ──────────────────────────────────────────────────────

def rule_score(ticker: str, sector: str, data: pd.DataFrame) -> dict:
    """
    Hand-crafted signal scoring. Returns a normalised score in [-1, 1]
    alongside raw metrics for display and meta-model training.
    """
    close   = data["Close"].squeeze()
    volume  = data["Volume"].squeeze()
    ret     = close.pct_change().dropna()

    # Core metrics
    ma7     = close.rolling(7).mean().iloc[-1].item()
    ma30    = close.rolling(30).mean().iloc[-1].item()
    ma50    = close.rolling(50).mean().iloc[-1].item()
    rsi_val = _rsi(close).iloc[-1].item()

    ema12   = close.ewm(span=12).mean().iloc[-1].item()
    ema26   = close.ewm(span=26).mean().iloc[-1].item()
    macd    = ema12 - ema26

    vol_ann = ret.std().item() * np.sqrt(252)
    mean_r  = ret.mean().item() * 252
    sharpe  = (mean_r - RISK_FREE_ANNUAL) / (vol_ann + 1e-9)

    vol_7d  = volume.rolling(7).mean().iloc[-1]
    vol_21d = volume.rolling(21).mean().iloc[-1]

    high52  = close.rolling(252, min_periods=60).max().iloc[-1].item()
    bb_mid  = close.rolling(20).mean().iloc[-1].item()
    bb_std  = close.rolling(20).std().iloc[-1].item()
    bb_pos  = (close.iloc[-1] - bb_mid) / (2 * bb_std + 1e-9)

    score   = 0
    reasons = []

    # Trend (+2 / -1)
    if ma7 > ma30 > ma50:
        score += 2; reasons.append("Strong uptrend (MA7 > MA30 > MA50)")
    elif ma7 > ma30:
        score += 1; reasons.append("Mild uptrend (MA7 > MA30)")
    else:
        score -= 1; reasons.append("Downtrend")

    # RSI (+2 / -2)
    if 45 <= rsi_val <= 65:
        score += 2; reasons.append(f"RSI healthy ({rsi_val:.1f})")
    elif rsi_val > 75:
        score -= 2; reasons.append(f"Overbought RSI ({rsi_val:.1f})")
    elif rsi_val < 30:
        score -= 1; reasons.append(f"Oversold RSI ({rsi_val:.1f})")
    else:
        score += 1; reasons.append(f"RSI neutral ({rsi_val:.1f})")

    # MACD (+1 / -1)
    if macd > 0:
        score += 1; reasons.append("MACD bullish")
    else:
        score -= 1; reasons.append("MACD bearish")

    # Volatility (+2 / +1)
    if vol_ann < 0.20:
        score += 2; reasons.append(f"Low volatility ({vol_ann:.1%})")
    elif vol_ann < 0.35:
        score += 1; reasons.append(f"Moderate volatility ({vol_ann:.1%})")
    else:
        reasons.append(f"High volatility ({vol_ann:.1%})")

    # Sharpe (+2 / +1 / -1)
    if sharpe > 1.5:
        score += 2; reasons.append(f"Excellent Sharpe ({sharpe:.2f})")
    elif sharpe > 0.5:
        score += 1; reasons.append(f"Good Sharpe ({sharpe:.2f})")
    elif sharpe < 0:
        score -= 1; reasons.append(f"Negative Sharpe ({sharpe:.2f})")

    # Volume surge (+1)
    if vol_7d > vol_21d * 1.2:
        score += 1; reasons.append("Rising volume")

    # Bollinger position (+1 / -1)
    if -0.5 < bb_pos < 0.5:
        score += 1; reasons.append("Price within Bollinger bands")
    elif bb_pos > 1.0:
        score -= 1; reasons.append("Price above upper Bollinger band")

    # 52-week proximity (+1)
    if close.iloc[-1] > high52 * 0.92:
        score += 1; reasons.append("Near 52-week high")

    # Normalise to [-1, 1] — max possible raw score is ~12
    score_norm = score / 12.0
    score_norm = float(np.clip(score_norm, -1.0, 1.0))

    return {
        "sector":      sector,
        "raw_score":   score,
        "rule_score":  score_norm,
        "volatility":  round(vol_ann, 4),
        "sharpe":      round(sharpe, 4),
        "rsi":         round(rsi_val, 2),
        "trend":       "Bullish" if ma7 > ma30 else "Bearish",
        "reasons":     reasons,
    }


# ── 4. ML Model (XGBoost + SHAP) ─────────────────────────────────────────────

class TickerModel:
    """Per-ticker XGBoost classifier with SHAP explainability."""

    LABEL_OFFSET = 1  # shift labels from {-1,0,1,2} to {0,1,2,3} for XGBoost

    def __init__(self):
        self.scaler       = StandardScaler()
        self.model        = xgb.XGBClassifier(
            n_estimators      = 300,
            max_depth         = 4,
            learning_rate     = 0.05,
            subsample         = 0.8,
            colsample_bytree  = 0.8,
            eval_metric       = "mlogloss",
            random_state      = 42,
            verbosity         = 0,
        )
        self.feature_cols = None
        self.explainer    = None
        self.fitted       = False

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "TickerModel":
        self.feature_cols = X.columns.tolist()
        X_sc = self.scaler.fit_transform(X)
        self.model.fit(X_sc, y + self.LABEL_OFFSET)
        try:
            self.explainer = shap.TreeExplainer(self.model)
        except Exception:
            self.explainer = None
        self.fitted    = True
        return self

    def _scale(self, X: pd.DataFrame) -> np.ndarray:
        return self.scaler.transform(X[self.feature_cols])

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict_proba(self._scale(X))

    def ml_score(self, X: pd.DataFrame) -> float:
        """
        Continuous score in [-1, +1] — probability-weighted class expectation.
        Classes after offset: 0→-1, 1→0, 2→+1, 3→+2 (before renorm to [-1,1])
        """
        proba   = self.predict_proba(X)[-1]           # last (live) row
        classes = self.model.classes_ - self.LABEL_OFFSET
        raw = float((proba * classes).sum())
        return float(np.clip(raw / 2.0, -1.0, 1.0))  # normalise to [-1, 1]

    def top_shap_drivers(self, X: pd.DataFrame, n: int = 5) -> list[tuple[str, float, str]]:
        if self.explainer is None:
            return []
        X_sc      = self._scale(X)
        shap_vals = self.explainer.shap_values(X_sc)
        pred_cls  = int(self.model.predict(X_sc[-1:])[0])  # predicted class (shifted)

        vals      = shap_vals[pred_cls][-1]
        abs_vals  = np.abs(vals)
        top_idx   = np.argsort(abs_vals)[::-1][:n]

        return [
            (self.feature_cols[i], round(abs_vals[i], 4), "+" if vals[i] > 0 else "-")
            for i in top_idx
        ]


def train_ml_models(stock_data: dict[str, pd.DataFrame]) -> dict[str, dict]:
    """Train one TickerModel per stock, return ml_score + SHAP drivers."""
    results = {}

    for ticker, data in stock_data.items():
        close   = data["Close"].squeeze()
        volume  = data["Volume"].squeeze()

        feats   = build_features(close, volume)
        labels  = make_labels(close).reindex(feats.index).dropna()
        feats   = feats.reindex(labels.index)

        # Hold out last HORIZON rows — they have no known forward return yet
        X_train = feats.iloc[:-HORIZON]
        y_train = labels.iloc[:-HORIZON]
        X_live  = feats

        if len(X_train) < 60 or y_train.nunique() < 2:
            print(f"  [{ticker}] skipping ML — insufficient training data")
            continue

        model = TickerModel().fit(X_train, y_train)
        score = model.ml_score(X_live)
        shap_drivers = model.top_shap_drivers(X_live)

        results[ticker] = {
            "ml_score":    round(score, 4),
            "ml_signal":   _signal_label(score),
            "shap_drivers": shap_drivers,
            "model":       model,
            "features":    X_live,
        }

    return results


def _signal_label(score: float) -> str:
    if score >  0.5: return "Strong Buy"
    if score >  0.15: return "Buy"
    if score < -0.5: return "Strong Sell"
    if score < -0.15: return "Sell"
    return "Hold"


# ── 5. Stacking Ensemble (Meta-Model) ────────────────────────────────────────

class StackingEnsemble:
    """
    Logistic Regression meta-model that learns the optimal weighting
    between rule_score and ml_score from historical data.
    This replaces any hardcoded 0.7/0.3 split.
    """

    def __init__(self):
        self.meta     = LogisticRegression(max_iter=500, random_state=42)
        self.fitted   = False
        self.coef_    = None

    def build_meta_dataset(
        self,
        stock_data:  dict[str, pd.DataFrame],
        ml_models:   dict[str, dict],
        rule_results: dict[str, dict],
    ) -> tuple[pd.DataFrame, pd.Series]:
        """
        For each ticker, roll forward in time and collect:
          - rule_score_norm  (from indicators at each bar)
          - ml_score         (from model at each bar)
          - label            (actual forward return label)
        """
        rows = []

        for ticker, data in stock_data.items():
            if ticker not in ml_models or ticker not in rule_results:
                continue

            close   = data["Close"].squeeze()
            volume  = data["Volume"].squeeze()
            feats   = build_features(close, volume)
            labels  = make_labels(close).reindex(feats.index).dropna()
            feats   = feats.reindex(labels.index)

            model   = ml_models[ticker]["model"]

            # Roll through time — skip last HORIZON (no label) and first 50 (warmup)
            for i in range(50, len(feats) - HORIZON):
                X_slice = feats.iloc[:i+1]
                ml_s    = model.ml_score(X_slice)

                # Rule score: approximate from ma_ratio and rsi at this bar
                rsi_t   = feats["rsi"].iloc[i]
                mar_t   = feats["ma_ratio_s"].iloc[i]
                rule_s  = float(np.clip((mar_t - 1) * 10 + (rsi_t - 50) / 50, -1, 1))

                rows.append({
                    "rule_score": rule_s,
                    "ml_score":   ml_s,
                    "label":      int(labels.iloc[i]),
                })

        df = pd.DataFrame(rows).dropna()
        return df[["rule_score", "ml_score"]], df["label"]

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "StackingEnsemble":
        self.meta.fit(X, y)
        self.coef_  = dict(zip(X.columns, self.meta.coef_[0]))
        self.fitted = True
        return self

    def fused_score(self, rule_s: float, ml_s: float) -> float:
        """
        Use meta-model probabilities to compute a weighted fused score.
        Falls back to simple 0.4/0.6 if meta-model isn't fitted.
        """
        if not self.fitted:
            return 0.4 * rule_s + 0.6 * ml_s

        X = pd.DataFrame([[rule_s, ml_s]], columns=["rule_score", "ml_score"])
        proba   = self.meta.predict_proba(X)[0]
        classes = self.meta.classes_.astype(float)
        raw     = float((proba * classes).sum())
        return float(np.clip(raw / 2.0, -1.0, 1.0))


# ── 6. Portfolio Allocation ───────────────────────────────────────────────────

def risk_parity_allocate(scores: dict[str, float], vols: dict[str, float]) -> dict[str, float]:
    """
    Allocate proportionally to fused_score / volatility (risk-parity weighting).
    Only stocks with positive fused score receive an allocation.
    """
    weighted = {
        t: s / (vols.get(t, 0.3) + 1e-9)
        for t, s in scores.items()
        if s > 0
    }
    total = sum(weighted.values())
    if total == 0:
        return {}
    return {t: round(w / total * 100, 2) for t, w in weighted.items()}


def check_diversification(portfolio: dict[str, float], rule_results: dict[str, dict]) -> list[str]:
    warnings_out = []
    sector_exp: dict[str, float] = {}
    for ticker, alloc in portfolio.items():
        sec = rule_results[ticker]["sector"]
        sector_exp[sec] = sector_exp.get(sec, 0) + alloc
    for sec, exp in sector_exp.items():
        if exp > MAX_SECTOR_PCT:
            warnings_out.append(f"High {sec} concentration: {exp:.1f}%")
    return warnings_out


# ── 7. Output ─────────────────────────────────────────────────────────────────

def print_results(
    portfolio:    dict[str, float],
    rule_results: dict[str, dict],
    ml_results:   dict[str, dict],
    fused_scores: dict[str, float],
    ensemble:     StackingEnsemble,
    warnings:     list[str],
):
    DIVIDER = "─" * 80

    print(f"\n{DIVIDER}")
    print("  NSE PORTFOLIO ALLOCATION ENGINE")
    print(DIVIDER)

    # Meta-model weights
    if ensemble.fitted and ensemble.coef_:
        r_w = ensemble.coef_.get("rule_score", 0)
        m_w = ensemble.coef_.get("ml_score",   0)
        total_w = abs(r_w) + abs(m_w) + 1e-9
        print(f"\n  Meta-model learned weights:")
        print(f"    Rule-based : {abs(r_w)/total_w*100:.1f}%")
        print(f"    ML (XGBoost): {abs(m_w)/total_w*100:.1f}%")

    print(f"\n{'Ticker':<12} {'Alloc':>6}  {'Fused':>6}  {'ML Signal':<14} {'Trend':<10} {'Sharpe':>7}  {'RSI':>6}  {'Vol':>7}")
    print(DIVIDER)

    for ticker, alloc in sorted(portfolio.items(), key=lambda x: -x[1]):
        r  = rule_results.get(ticker, {})
        ml = ml_results.get(ticker, {})
        fs = fused_scores.get(ticker, 0)
        print(
            f"{ticker:<12} {alloc:>5.1f}%  {fs:>+.3f}  "
            f"{ml.get('ml_signal','—'):<14} {r.get('trend','—'):<10} "
            f"{r.get('sharpe',0):>7.2f}  {r.get('rsi',0):>6.1f}  "
            f"{r.get('volatility',0):>6.1%}"
        )

    print(f"\n{DIVIDER}")
    print("  RULE-BASED REASONING")
    print(DIVIDER)
    for ticker in portfolio:
        r = rule_results.get(ticker, {})
        reasons = r.get("reasons", [])
        print(f"\n  {ticker} (score: {r.get('raw_score',0):+d})")
        for reason in reasons:
            print(f"    • {reason}")

    print(f"\n{DIVIDER}")
    print("  ML SHAP EXPLANATIONS  (top drivers per stock)")
    print(DIVIDER)
    for ticker in portfolio:
        ml = ml_results.get(ticker, {})
        drivers = ml.get("shap_drivers", [])
        print(f"\n  {ticker}  [{ml.get('ml_signal','—')}]  score={ml.get('ml_score',0):+.3f}")
        for feat, impact, direction in drivers:
            print(f"    {direction}  {feat:<22} impact={impact:.4f}")

    if warnings:
        print(f"\n{DIVIDER}")
        print("  WARNINGS")
        print(DIVIDER)
        for w in warnings:
            print(f"  ⚠  {w}")

    print(f"\n{DIVIDER}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\nFetching market data...")
    stock_data: dict[str, pd.DataFrame] = {}
    for ticker in STOCKS:
        df = fetch(ticker)
        if df is not None:
            stock_data[ticker] = df
            print(f"  ✓ {ticker:<12} {len(df)} rows")
        else:
            print(f"  ✗ {ticker:<12} insufficient data — skipped")

    if not stock_data:
        print("No data fetched. Check your internet connection or tickers.")
        return

    # Rule-based scoring
    print("\nRunning rule-based scoring...")
    rule_results: dict[str, dict] = {}
    for ticker, data in stock_data.items():
        rule_results[ticker] = rule_score(ticker, STOCKS[ticker], data)

    # ML models
    print("\nTraining ML models (XGBoost per ticker)...")
    ml_results = train_ml_models(stock_data)

    # Stacking ensemble
    print("\nFitting stacking ensemble (meta-model)...")
    ensemble = StackingEnsemble()
    try:
        meta_X, meta_y = ensemble.build_meta_dataset(stock_data, ml_results, rule_results)
        if len(meta_X) > 50 and meta_y.nunique() > 1:
            ensemble.fit(meta_X, meta_y)
            print("  Meta-model fitted successfully.")
        else:
            print("  Not enough meta-data — falling back to 0.4/0.6 split.")
    except Exception as e:
        print(f"  Meta-model failed ({e}) — falling back to 0.4/0.6 split.")

    # Fused scores
    fused_scores: dict[str, float] = {}
    for ticker in stock_data:
        if ticker not in rule_results:
            continue
        r_s = rule_results[ticker]["rule_score"]
        m_s = ml_results[ticker]["ml_score"] if ticker in ml_results else 0.0
        fused_scores[ticker] = ensemble.fused_score(r_s, m_s)

    # Allocation
    vols      = {t: rule_results[t]["volatility"] for t in rule_results}
    portfolio = risk_parity_allocate(fused_scores, vols)
    warnings  = check_diversification(portfolio, rule_results)

    # Print
    print_results(portfolio, rule_results, ml_results, fused_scores, ensemble, warnings)


if __name__ == "__main__":
    main()