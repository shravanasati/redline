import asyncio
import os
import signal
import sys
from dotenv import load_dotenv
import nats
from nats.errors import TimeoutError as NatsTimeoutError

from pb.tasks.results_pb2 import MonitorTaskResult  # type: ignore

# Load environment variables from .env file
load_dotenv()

# Configurable parameters
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")
STREAM_NAME = "RESULTS"
SUBJECT = "results.>"
DURABLE_NAME = "pit-wall-results"
BATCH_SIZE = 25
FETCH_TIMEOUT = 5.0  # seconds


async def run_consumer() -> None:
    nats_user = os.getenv("NATS_USER_ALERTING")
    nats_pass = os.getenv("NATS_PASS_ALERTING")

    if not nats_user or not nats_pass:
        raise RuntimeError(
            "NATS_USER_ALERTING and NATS_PASS_ALERTING environment variables must be set."
        )

    print(f"Connecting to NATS at {NATS_URL} as user '{nats_user}'...")
    nc = await nats.connect(NATS_URL, user=nats_user, password=nats_pass)
    js = nc.jetstream()

    print(
        f"Creating/binding durable pull consumer '{DURABLE_NAME}' on stream '{STREAM_NAME}' (subject: '{SUBJECT}')..."
    )
    sub = await js.pull_subscribe(SUBJECT, durable=DURABLE_NAME, stream=STREAM_NAME)

    print(
        f"Started consumer loop. Fetching batches of {BATCH_SIZE} messages (timeout: {FETCH_TIMEOUT}s)..."
    )
    try:
        while True:
            try:
                msgs = await sub.fetch(batch=BATCH_SIZE, timeout=FETCH_TIMEOUT)
                for msg in msgs:
                    result = MonitorTaskResult()
                    result.ParseFromString(msg.data)
                    print(f"Received MonitorTaskResult:\n{result}")
                    await msg.ack()
            except (NatsTimeoutError, asyncio.TimeoutError):
                continue
            except Exception as e:
                print(f"Error fetching/processing messages: {e}", file=sys.stderr)
                await asyncio.sleep(1)
    except asyncio.CancelledError:
        print("Consumer loop cancelled.")
    finally:
        print("Draining NATS connection...")
        await nc.drain()


def main() -> None:
    try:
        asyncio.run(run_consumer())
    except KeyboardInterrupt:
        print("\nExiting pit-wall service.")


if __name__ == "__main__":
    main()
