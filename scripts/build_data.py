"""Build the small JSON files the game ships with.

Every number shown in-game is computed here, never typed by hand.
Run:  pip install -r scripts/requirements.txt && python scripts/build_data.py
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import io
import json
import statistics
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts" / "raw"
# The series is a monorepo; episode 1 owns the JSON this pipeline produces.
OUT = ROOT / "episodes" / "noise-and-trends" / "src" / "data"
# Committed copies of the official Met Office summary CSVs, checked before the
# network so any machine -- CI, a sandboxed session, an offline laptop -- can
# rebuild the data exactly. metoffice.gov.uk is blocked on some networks, and the
# GitHub mirror we fall back to carries only the central estimate, with no
# confidence limits. To refresh, replace the file and its .source.json sidecar.
SOURCE = ROOT / "data" / "source"

# Official Met Office URLs first; the datahub mirror (same files, re-hosted on
# GitHub) is the fallback for networks that block metoffice.gov.uk.
HADCRUT_VERSION = "HadCRUT.5.1.0.0"
_HC = f"https://www.metoffice.gov.uk/hadobs/hadcrut5/data/{HADCRUT_VERSION}/analysis/diagnostics/{HADCRUT_VERSION}.analysis.summary_series.global"
HADCRUT_ANNUAL = [f"{_HC}.annual.csv", "https://raw.githubusercontent.com/datasets/global-temp/main/data/annual.csv"]
HADCRUT_MONTHLY = [f"{_HC}.monthly.csv", "https://raw.githubusercontent.com/datasets/global-temp/main/data/monthly.csv"]
TIERNEY_ATM = ["https://raw.githubusercontent.com/jesstierney/lgmDA/master/version1.0/Tierney2020_DA_atm.nc"]

BASELINE = (1850, 1900)          # "pre-industrial", IPCC convention
STRIPE_REFERENCE = (1971, 2000)  # showyourstripes colours are centred on this period
STRIPE_SIGMA_PERIOD = (1901, 2000)
STRIPE_SIGMAS = 2.6              # colour scale saturates at +/- this many std devs
RECENT_TREND_YEARS = 50
# Tierney 2020 gives a snapshot difference (LGM 23-19 ka minus Late Holocene 4-0 ka),
# not a time series. The main deglacial warming took somewhere around 7,000-10,000
# years (roughly 18-11 ka at the short end); we report the rate comparison as a
# range over that assumption instead of a single falsely precise number.
DEGLACIATION_YEARS = 10_000
DEGLACIATION_YEARS_SHORT = 7_000
# Cherry-pick level: a real talking point, "it's been cooling since 2016". The
# window starts on a super El Nino peak and ends in a triple La Nina. We also
# report how that claim changes with one more year, and how common short
# downward windows are, so the game can show why short windows mislead.
CHERRY_START = 2016
CHERRY_END = 2022
CHERRY_FROM = 1970

sources: list[dict] = []


def _provenance_path(name: str) -> Path:
    """Where the origin of a cached file is recorded, beside the file itself."""
    return RAW / f"{name}.source.json"


def _header(name: str, data: bytes) -> dict:
    """First line of a CSV, so a human can check the dataset version shipped."""
    if not name.endswith(".csv"):
        return {}
    first = data.split(b"\n", 1)[0].decode("utf-8", "replace").strip()
    return {"header": first[:200]}


def _record(name: str, data: bytes, origin: str, meta_file: Path) -> None:
    """Add one entry to sources.json, carrying provenance from a sidecar if present."""
    entry = {"file": name, "sha256": hashlib.sha256(data).hexdigest(), "origin": origin}
    if meta_file.exists():
        side = json.loads(meta_file.read_text())
        # The sidecar's own checksum is a claim about the file; keep ours as the truth.
        side.pop("sha256", None)
        entry.update(side)
    entry.update(_header(name, data))
    sources.append(entry)


def fetch(urls: list[str], name: str) -> bytes:
    RAW.mkdir(parents=True, exist_ok=True)
    committed = SOURCE / name
    if committed.exists():
        data = committed.read_bytes()
        _record(name, data, "data/source (committed)", SOURCE / f"{name}.source.json")
        return data
    cached = RAW / name
    if cached.exists():
        data = cached.read_bytes()
        # A cache hit used to record url="cache" with no date and no origin, which
        # meant the shipped numbers could not be tied to any particular download.
        # The origin is written beside the file on the first fetch and read back here.
        entry = {"file": name, "sha256": hashlib.sha256(data).hexdigest(), "from_cache": True}
        meta = _provenance_path(name)
        if meta.exists():
            entry.update(json.loads(meta.read_text()))
        else:
            entry.update({
                "url": "unknown: cached before provenance was recorded",
                "retrieved": dt.date.fromtimestamp(cached.stat().st_mtime).isoformat(),
            })
        entry.update(_header(name, data))
        sources.append(entry)
        return data
    last_error: Exception | None = None
    for index, url in enumerate(urls):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                data = resp.read()
            cached.write_bytes(data)
            if index > 0:
                print(f"  WARNING: primary source unavailable, used mirror {url}")
            provenance = {"url": url, "retrieved": dt.date.today().isoformat(), "mirror": index > 0}
            _provenance_path(name).write_text(json.dumps(provenance, indent=1))
            sources.append({"file": name, "sha256": hashlib.sha256(data).hexdigest(),
                            **provenance, **_header(name, data)})
            return data
        except Exception as err:  # try the next mirror
            print(f"  could not fetch {url}: {err}")
            last_error = err
    raise RuntimeError(f"all sources failed for {name}") from last_error


def parse_hadcrut(raw: bytes, monthly: bool) -> list[tuple[str, float]]:
    """Accepts either the official CSV (Time, Anomaly, ...) or the mirror (Source, Year, Mean)."""
    rows = list(csv.reader(io.StringIO(raw.decode("utf-8"))))
    header, body = rows[0], rows[1:]
    if header[0] == "Source":
        pairs = [(r[1], float(r[2])) for r in body if r[0] == "GCAG"]
    else:
        pairs = [(r[0], float(r[1])) for r in body if r[1] not in ("", "NaN")]
    pairs.sort()
    if monthly:
        return pairs
    return [(p[0][:4], p[1]) for p in pairs]


def complete_years(monthly: list[tuple[str, float]]) -> set[int]:
    counts: dict[int, int] = {}
    for stamp, _ in monthly:
        counts[int(stamp[:4])] = counts.get(int(stamp[:4]), 0) + 1
    return {y for y, n in counts.items() if n == 12}


def mean_between(series: dict[int, float], period: tuple[int, int]) -> float:
    return statistics.fmean(v for y, v in series.items() if period[0] <= y <= period[1])


def ols_slope(xs: list[float], ys: list[float]) -> float:
    return float(np.polyfit(xs, ys, 1)[0])


def lgm_global_delta(raw_nc: bytes) -> tuple[float, float]:
    import netCDF4  # imported here so the HadCRUT part runs without it

    ds = netCDF4.Dataset("mem.nc", memory=raw_nc)
    lat = np.asarray(ds["lat"][:], dtype=float)
    delta = np.ma.filled(ds["deltaSAT"][:].astype(float), np.nan)
    err = np.ma.filled(ds["errdeltaSAT"][:].astype(float), np.nan)
    weights = np.cos(np.deg2rad(lat))[:, None] * np.ones_like(delta)
    ok = np.isfinite(delta)
    mean = float((delta[ok] * weights[ok]).sum() / weights[ok].sum())
    # Mean of gridpoint 1-sigma errors: a rough indicator only (errors are spatially correlated).
    mean_err = float((err[ok] * weights[ok]).sum() / weights[ok].sum())
    return mean, mean_err


def build() -> dict:
    print("HadCRUT5 ...")
    monthly_raw = parse_hadcrut(fetch(HADCRUT_MONTHLY, "hadcrut_monthly.csv"), monthly=True)
    annual_raw = parse_hadcrut(fetch(HADCRUT_ANNUAL, "hadcrut_annual.csv"), monthly=False)

    full_years = complete_years(monthly_raw)
    annual = {int(y): v for y, v in annual_raw if int(y) in full_years}
    offset = mean_between(annual, BASELINE)
    annual = {y: round(v - offset, 4) for y, v in annual.items()}
    last_year = max(annual)
    monthly = [(s, round(v - offset, 4)) for s, v in monthly_raw if int(s[:4]) <= last_year]

    years = sorted(annual)
    assert years == list(range(years[0], years[-1] + 1)), "annual series has gaps"

    sigma_values = [annual[y] for y in years if STRIPE_SIGMA_PERIOD[0] <= y <= STRIPE_SIGMA_PERIOD[1]]
    stripe_centre = mean_between(annual, STRIPE_REFERENCE)
    stripe_half_range = STRIPE_SIGMAS * statistics.pstdev(sigma_values)

    print("Tierney 2020 LGM ...")
    lgm_delta, lgm_err = lgm_global_delta(fetch(TIERNEY_ATM, "tierney2020_da_atm.nc"))

    recent = years[-RECENT_TREND_YEARS:]
    recent_rate = ols_slope(recent, [annual[y] for y in recent]) * 100
    deglacial_rate = -lgm_delta / DEGLACIATION_YEARS * 100
    deglacial_rate_fast = -lgm_delta / DEGLACIATION_YEARS_SHORT * 100
    latest_decade = statistics.fmean(annual[y] for y in years[-10:])

    def decade_trend(first: int, last: int) -> float:
        span = list(range(first, last + 1))
        return ols_slope(span, [annual[y] for y in span]) * 10

    cherry_len = CHERRY_END - CHERRY_START + 1
    windows = [decade_trend(s, s + cherry_len - 1) for s in range(CHERRY_FROM, last_year - cherry_len + 2)]
    cooling_share = sum(1 for s in windows if s < 0) / len(windows)
    since = [y for y in years if y >= CHERRY_FROM]
    long_slope = ols_slope(since, [annual[y] for y in since]) * 10
    warmest = sorted(sorted(years, key=lambda y: annual[y])[-10:])
    last_year_rank = sorted(years, key=lambda y: -annual[y]).index(last_year) + 1

    meta_hc = {
        "dataset": HADCRUT_VERSION, "units": "degC", "baseline": f"{BASELINE[0]}-{BASELINE[1]}",
        "citation": "Morice et al. (2021), JGR Atmospheres, doi:10.1029/2019JD032361. Met Office Hadley Centre / CRU.",
        "licence": "Open Government Licence v3",
    }
    global_json = {
        "meta": meta_hc,
        "annual": {"start": years[0], "values": [annual[y] for y in years]},
        "monthly": {"start": monthly[0][0], "values": [v for _, v in monthly]},
        "stripes": {"reference": f"{STRIPE_REFERENCE[0]}-{STRIPE_REFERENCE[1]}",
                    "centre": round(stripe_centre, 4), "halfRange": round(stripe_half_range, 4)},
    }
    paleo_json = {
        "meta": {"dataset": "Tierney et al. (2020) LGM data assimilation v1.0",
                 "citation": "Tierney et al. (2020), Nature 584, 569-573, doi:10.1038/s41586-020-2617-x",
                 "method": "area-weighted global mean of deltaSAT (LGM 23-19 ka minus Late Holocene 4-0 ka)"},
        "lgmDelta": round(lgm_delta, 2), "lgmGridErrorMean": round(lgm_err, 2),
        "lgmAgeYearsBP": 21_000, "deglaciationYearsAssumed": DEGLACIATION_YEARS,
    }
    derived_json = {
        "firstYear": years[0], "lastYear": last_year,
        "firstYearAnomaly": annual[years[0]], "lastYearAnomaly": annual[last_year],
        "latestDecadeMean": round(latest_decade, 2),
        "recentTrendPerCentury": round(recent_rate, 2), "recentTrendYears": RECENT_TREND_YEARS,
        "deglacialRatePerCentury": round(deglacial_rate, 3),
        "deglacialRateFastPerCentury": round(deglacial_rate_fast, 3),
        "deglaciationYearsRange": [DEGLACIATION_YEARS_SHORT, DEGLACIATION_YEARS],
        # Plain integers, rounded down/up honestly (no generous rounding to 5s).
        "rateRatioLow": int(recent_rate / deglacial_rate_fast),
        "rateRatioHigh": int(round(recent_rate / deglacial_rate)),
        "cherry": {
            "start": CHERRY_START, "end": CHERRY_END, "searchedFrom": CHERRY_FROM,
            "trendPerDecade": round(decade_trend(CHERRY_START, CHERRY_END), 3),
            "trendPlusOneYear": round(decade_trend(CHERRY_START, CHERRY_END + 1), 3),
            "trendToLatest": round(decade_trend(CHERRY_START, last_year), 3),
            "coolingWindowShare": round(cooling_share, 3), "windowsSearched": len(windows),
            "longTrendPerDecade": round(long_slope, 3),
        },
        "warmestTen": warmest,
        "lastYearRank": last_year_rank,
    }
    return {"global": global_json, "paleo": paleo_json, "derived": derived_json}


def main() -> None:
    outputs = build()
    OUT.mkdir(parents=True, exist_ok=True)
    for name, payload in outputs.items():
        (OUT / f"{name}.json").write_text(json.dumps(payload, separators=(",", ":")))
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "sources.json").write_text(json.dumps(sources, indent=2))
    print(json.dumps(outputs["derived"], indent=2))
    print(json.dumps(outputs["paleo"]["lgmDelta"]))


if __name__ == "__main__":
    main()
