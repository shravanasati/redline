#!/usr/bin/env python3
import os
import re
import sys
import statistics
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

import psycopg2

DEFAULT_PATH = "scripts/race_control_stat.out"
TIMESCALE_DSN = os.getenv(
    "TIMESCALE_URL",
    "postgres://postgres:passwordhaha@localhost:5433/redline_metrics",
)

IST = ZoneInfo("Asia/Kolkata")


def parse_first_timestamp(path: str) -> tuple[datetime, datetime]:
    """Return (first_ts, last_ts) in UTC from pidstat output."""
    first_ts = None
    last_ts = None
    session_date = None
    with open(path) as f:
        for line in f:
            # Extract date from header: "Linux ... (fedora) \t06/09/26 ..."
            if line.startswith("Linux") and session_date is None:
                dm = re.search(r"\t(\d{2}/\d{2}/\d{2})\s", line)
                if dm:
                    session_date = datetime.strptime(
                        dm.group(1), "%d/%m/%y"
                    ).date()
                continue
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("Linux"):
                continue
            m = re.match(
                r"(\d{2}:\d{2}:\d{2})\s+(AM|PM)\s+\w+\s+", line
            )
            if not m:
                continue
            time_str, ampm = m.group(1), m.group(2)
            naive = datetime.strptime(
                f"{time_str} {ampm}", "%I:%M:%S %p"
            )
            if session_date:
                naive = naive.replace(
                    year=session_date.year,
                    month=session_date.month,
                    day=session_date.day,
                )
            dt_ist = naive.replace(tzinfo=IST)
            dt_utc = dt_ist.astimezone(timezone.utc)
            if first_ts is None:
                first_ts = dt_utc
            last_ts = dt_utc
    if first_ts is None:
        print("Could not parse timestamps from pidstat output.")
        sys.exit(1)
    return first_ts, last_ts


def parse_pidstat(path: str) -> None:
    cpu_values: list[float] = []
    mem_values: list[float] = []
    rss_values: list[float] = []

    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("Linux"):
                continue
            parts = line.split()
            try:
                cpu = float(parts[9])
                rss = float(parts[14])
                mem = float(parts[15])
            except (IndexError, ValueError):
                continue
            cpu_values.append(cpu)
            rss_values.append(rss)
            mem_values.append(mem)

    if not cpu_values:
        print("No data samples found.")
        sys.exit(1)

    n = len(cpu_values)
    print(f"Samples : {n}")
    print()
    print("CPU (%):")
    print(f"  Mean  : {statistics.mean(cpu_values):.2f}")
    print(f"  Median: {statistics.median(cpu_values):.2f}")
    print(f"  Stdev : {statistics.stdev(cpu_values):.2f}" if n > 1 else "")
    print(f"  Min   : {min(cpu_values):.2f}")
    print(f"  Max   : {max(cpu_values):.2f}")
    print()
    print("Memory (%MEM):")
    print(f"  Mean  : {statistics.mean(mem_values):.2f}")
    print(f"  Median: {statistics.median(mem_values):.2f}")
    print(f"  Stdev : {statistics.stdev(mem_values):.2f}" if n > 1 else "")
    print(f"  Min   : {min(mem_values):.2f}")
    print(f"  Max   : {max(mem_values):.2f}")
    print()
    print("RSS (KB):")
    print(f"  Mean  : {statistics.mean(rss_values):.0f}")
    print(f"  Median: {statistics.median(rss_values):.0f}")
    print(f"  Stdev : {statistics.stdev(rss_values):.0f}" if n > 1 else "")
    print(f"  Min   : {min(rss_values):.0f}")
    print(f"  Max   : {max(rss_values):.0f}")


def probe_throughput(path: str) -> None:
    first_ts, last_ts = parse_first_timestamp(path)
    duration = (last_ts - first_ts).total_seconds()

    window_end = last_ts + timedelta(minutes=1)
    try:
        conn = psycopg2.connect(TIMESCALE_DSN)
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM monitor_results WHERE timestamp >= %s AND timestamp < %s",
            (first_ts, window_end),
        )
        total_rows = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(*) FILTER (WHERE success) FROM monitor_results WHERE timestamp >= %s AND timestamp < %s",
            (first_ts, window_end),
        )
        success_rows = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(DISTINCT monitor_id) FROM monitor_results WHERE timestamp >= %s AND timestamp < %s",
            (first_ts, window_end),
        )
        unique_monitors = cur.fetchone()[0]
        cur.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"\nCould not connect to TimescaleDB: {e}")
        return

    throughput = total_rows / duration if duration > 0 else 0
    success_throughput = success_rows / duration if duration > 0 else 0

    print()
    print("TimescaleDB Probe Throughput:")
    print(f"  Window start : {first_ts.isoformat()}")
    print(f"  Window end   : {last_ts.isoformat()}")
    print(f"  Duration     : {duration:.0f}s")
    print(f"  Total probes : {total_rows:,}")
    print(f"  Success      : {success_rows:,}")
    print(f"  Unique mon.  : {unique_monitors}")
    print(f"  Throughput   : {throughput:.1f} probes/s")
    print(f"  Succ. rate   : {success_throughput:.1f} probes/s")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    parse_pidstat(path)
    probe_throughput(path)
