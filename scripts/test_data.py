"""Sanity checks on the generated JSON. Run after build_data.py: pytest scripts/"""
import json
import math
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data"


def load(name):
    return json.loads((DATA / f"{name}.json").read_text())


def test_annual_is_rebased_and_complete():
    g = load("global")
    vals = g["annual"]["values"]
    assert g["annual"]["start"] == 1850
    assert all(math.isfinite(v) for v in vals)
    baseline = vals[: 1900 - 1850 + 1]
    assert abs(sum(baseline) / len(baseline)) < 1e-3
    assert 0.8 < max(vals[-10:]) < 2.5  # recent years are clearly warm


def test_monthly_matches_annual_length():
    g = load("global")
    assert len(g["monthly"]["values"]) == 12 * len(g["annual"]["values"])


def test_paleo_in_expected_range():
    p = load("paleo")
    assert -8 < p["lgmDelta"] < -4


def test_derived_rates_positive():
    d = load("derived")
    assert d["recentTrendPerCentury"] > d["deglacialRatePerCentury"] > 0


def test_rate_range_and_cherry_pick():
    d = load("derived")
    assert 0 < d["rateRatioLow"] <= d["rateRatioHigh"]
    c = d["cherry"]
    assert c["trendPerDecade"] < 0 < c["longTrendPerDecade"]
    assert 0 < c["coolingWindowShare"] < 0.5
    assert len(d["warmestTen"]) == 10
