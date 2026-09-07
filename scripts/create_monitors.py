#!/usr/bin/env python3
"""Create a large batch of monitors through the Paddock Server Action API.

The endpoint is the same endpoint used by the monitor form:
POST /dashboard/monitors with the createMonitorAction id in Next-Action.

Example:
    REDLINE_COOKIE='redline.session_token=...' \
    python scripts/create_monitors.py --base-url http://localhost:3000
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass


DEFAULT_COUNT = 10_000
DEFAULT_WORKERS = 8
DEFAULT_ACTION_ID = "6089ad06d67aabc22d6985c8cff4ce9c795b439fe6"
SUCCESS_ENDPOINTS = (
    "https://example.com/",
    "https://httpbin.org/status/200",
)
FAILING_ENDPOINTS = (
    "https://httpbin.org/status/404",
    "https://httpbin.org/status/500",
)


@dataclass(frozen=True)
class CreateResult:
    index: int
    ok: bool
    status: int | None
    detail: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("REDLINE_BASE_URL", "http://localhost:3000"),
        help="Paddock origin (default: REDLINE_BASE_URL or http://localhost:3000)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=DEFAULT_COUNT,
        help=f"Number of monitors to create (default: {DEFAULT_COUNT})",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Concurrent requests (default: {DEFAULT_WORKERS})",
    )
    parser.add_argument(
        "--action-id",
        default=os.environ.get("REDLINE_ACTION_ID", DEFAULT_ACTION_ID),
        help="Next-Action id (default: REDLINE_ACTION_ID or current dev id)",
    )
    parser.add_argument(
        "--cookie-file",
        help="Read the Cookie header value from this file",
    )
    return parser.parse_args()


def read_cookie(args: argparse.Namespace) -> str:
    if args.cookie_file:
        with open(args.cookie_file, encoding="utf-8") as cookie_file:
            cookie = cookie_file.read().strip()
    else:
        cookie = os.environ.get("REDLINE_COOKIE", "").strip()

    if not cookie:
        raise ValueError(
            "Authentication is required. Set REDLINE_COOKIE or use --cookie-file."
        )
    return cookie


def multipart_form(fields: dict[str, str]) -> tuple[bytes, str]:
    boundary = f"----redline-{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="_1_{name}"\r\n\r\n'.encode(),
                value.encode(),
                b"\r\n",
            ]
        )
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            b'Content-Disposition: form-data; name="0"\r\n\r\n',
            b'[null,"$K1"]\r\n',
        ]
    )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def monitor_definition(index: int) -> dict[str, str]:
    is_success = index % 2 == 0
    endpoint = (SUCCESS_ENDPOINTS if is_success else FAILING_ENDPOINTS)[
        (index // 2) % 2
    ]
    return {
        "name": f"load-test-{index + 1:05d}-{'success' if is_success else 'failure'}",
        "type": "HTTPS",
        "endpoint": endpoint,
        "frequency": "60",
        "timeout": "10",
        "assertions": json.dumps(
            [
                {
                    "target": "status_code",
                    "operator": "equals",
                    "value": 200,
                }
            ]
        ),
        "metadata": json.dumps({"method": "GET"}),
        "notificationRules": "[]",
    }


def create_one(index: int, base_url: str, action_id: str, cookie: str) -> CreateResult:
    fields = monitor_definition(index)
    body, content_type = multipart_form(fields)
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/dashboard/monitors",
        data=body,
        method="POST",
        headers={
            "Accept": "text/x-component",
            "Content-Type": content_type,
            "Cookie": cookie,
            "Next-Action": action_id,
            "User-Agent": "redline-monitor-loader/1.0",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            status = response.status
    except urllib.error.HTTPError as error:
        response_body = error.read().decode("utf-8", errors="replace")
        return CreateResult(index, False, error.code, response_body[:160])
    except (OSError, TimeoutError) as error:
        return CreateResult(index, False, None, str(error))

    if status < 200 or status >= 300:
        return CreateResult(index, False, status, response_body[:160])
    if re.search(r'"success":false', response_body):
        return CreateResult(index, False, status, response_body[:160])
    if not re.search(r'"success":true', response_body):
        return CreateResult(index, False, status, "unexpected Server Action response")
    return CreateResult(index, True, status, fields["endpoint"])


def main() -> int:
    args = parse_args()
    if args.count < 1 or args.workers < 1:
        print("--count and --workers must be positive", file=sys.stderr)
        return 2

    try:
        cookie = read_cookie(args)
    except (OSError, ValueError) as error:
        print(error, file=sys.stderr)
        return 2

    started = time.monotonic()
    results: list[CreateResult] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [
            pool.submit(create_one, index, args.base_url, args.action_id, cookie)
            for index in range(args.count)
        ]
        for completed, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            results.append(result)
            if not result.ok:
                print(
                    f"[{result.index + 1}/{args.count}] failed "
                    f"status={result.status}: {result.detail}",
                    file=sys.stderr,
                )
            elif completed % 100 == 0 or completed == args.count:
                print(f"created {completed}/{args.count}")

    successful = sum(result.ok for result in results)
    elapsed = time.monotonic() - started
    print(
        f"Finished: {successful}/{args.count} created successfully in {elapsed:.1f}s "
        f"({args.count / elapsed:.1f} requests/s)"
    )
    return 0 if successful == args.count else 1


if __name__ == "__main__":
    raise SystemExit(main())
