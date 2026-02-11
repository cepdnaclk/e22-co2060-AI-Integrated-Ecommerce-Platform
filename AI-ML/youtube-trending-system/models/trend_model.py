def score(df):
    df["ConsistencyScore"] = 1 / (df["Consistency"] + 1)
    df["TrendScore"] = (
        0.35 * df["GrowthRate"] +
        0.25 * df["Acceleration"].rank(pct=True) +
        0.20 * df["RelativePerformance"] +
        0.20 * df["ConsistencyScore"]
    )
    return df.sort_values("TrendScore", ascending=False)
