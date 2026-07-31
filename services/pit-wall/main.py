import asyncio
import logging
from typing import Tuple
from dotenv import load_dotenv
import asyncpg
import nats
from nats.js import JetStreamContext
from nats.errors import TimeoutError as NatsTimeoutError

from config import get_nats_config, get_timescale_dsn
from timescale import (
    init_timescale_pool,
    init_timescale_schema,
    insert_monitor_results_batch,
)
from pb.tasks.results_pb2 import MonitorTaskResult  # type: ignore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pit-wall")

# Load environment variables from .env file
load_dotenv()

# Configurable parameters
STREAM_NAME = "RESULTS"
SUBJECT = "results.>"
DURABLE_NAME = "pit-wall-results"
BATCH_SIZE = 25
FETCH_TIMEOUT = 5.0  # seconds


async def init_timescale() -> asyncpg.Pool:
    """
    Initialize TimescaleDB connection pool and schema.
    """
    dsn = get_timescale_dsn()
    pool = await init_timescale_pool(dsn)
    await init_timescale_schema(pool)
    return pool


async def init_nats() -> Tuple[nats.NATS, JetStreamContext.PullSubscription]:
    """
    Validate credentials, connect to NATS, and bind durable JetStream pull subscriber.
    """
    nats_config = get_nats_config()

    logger.info(
        "Connecting to NATS at %s as user '%s'...",
        nats_config.url,
        nats_config.user,
    )
    nc = await nats.connect(
        nats_config.url, user=nats_config.user, password=nats_config.password
    )
    js = nc.jetstream()

    logger.info(
        "Creating/binding durable pull consumer '%s' on stream '%s' (subject: '%s')...",
        DURABLE_NAME,
        STREAM_NAME,
        SUBJECT,
    )
    sub = await js.pull_subscribe(SUBJECT, durable=DURABLE_NAME, stream=STREAM_NAME)
    return nc, sub


async def run_consumer(
    pool: asyncpg.Pool, sub: JetStreamContext.PullSubscription
) -> None:
    """
    Fetch batches from NATS pull consumer, parse protobuf, and insert to TimescaleDB.
    """
    logger.info(
        "Started consumer loop. Fetching batches of %d messages (timeout: %.1fs)...",
        BATCH_SIZE,
        FETCH_TIMEOUT,
    )
    while True:
        try:
            msgs = await sub.fetch(batch=BATCH_SIZE, timeout=FETCH_TIMEOUT)
            records = []

            for msg in msgs:
                result = MonitorTaskResult()
                result.ParseFromString(msg.data)

                time_val = result.timestamp.ToDatetime()
                latency_ms = result.latency.ToTimedelta().total_seconds() * 1000.0
                http_status = (
                    result.http_status_code if result.http_status_code != 0 else None
                )
                error_msg = result.error_message if result.error_message else None
                worker_reg = result.worker_region if result.worker_region else "unknown"

                records.append(
                    (
                        time_val,
                        result.id,
                        result.success,
                        latency_ms,
                        http_status,
                        worker_reg,
                        error_msg,
                    )
                )

            if records:
                # Write batch to TimescaleDB
                await insert_monitor_results_batch(pool, records)
                logger.info(
                    "Persisted batch of %d monitor results to TimescaleDB.",
                    len(records),
                )

                # Acknowledge messages only after successful DB insert
                for msg in msgs:
                    await msg.ack()

        except (NatsTimeoutError, asyncio.TimeoutError):
            continue
        except Exception as e:
            logger.error("Error fetching/processing messages: %s", e, exc_info=True)
            await asyncio.sleep(1)


async def main() -> None:
    pool = None
    nc = None
    try:
        # 1. Initialize DB and NATS separately
        pool = await init_timescale()
        nc, sub = await init_nats()

        # 2. Run consumer loop
        await run_consumer(pool, sub)
    except asyncio.CancelledError:
        logger.info("Consumer loop cancelled.")
    except Exception as e:
        logger.critical("Fatal error in main service loop: %s", e, exc_info=True)
    finally:
        logger.info("Draining NATS connection and closing DB pool...")
        if nc and not nc.is_closed:
            await nc.drain()
        if pool:
            await pool.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting pit-wall service.")
