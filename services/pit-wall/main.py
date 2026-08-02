import asyncio
import logging
from typing import Tuple
from dotenv import load_dotenv
import asyncpg
import nats
from nats.js import JetStreamContext
from nats.errors import TimeoutError as NatsTimeoutError

from config import get_app_db_dsn, get_nats_config, get_timescale_dsn
from notifications import (
    DiscordNotificationChannel,
    NotificationManager,
    handle_probe_failure,
    init_app_db_pool,
)
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


async def init_app_db() -> asyncpg.Pool:
    """
    Initialize Application PostgreSQL DB connection pool.
    """
    dsn = get_app_db_dsn()
    return await init_app_db_pool(dsn)


def setup_notification_manager() -> NotificationManager:
    """
    Instantiate NotificationManager and register supported channel handlers.
    """
    manager = NotificationManager()
    manager.register_channel("discord", DiscordNotificationChannel())
    return manager


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
    timescale_pool: asyncpg.Pool,
    app_db_pool: asyncpg.Pool,
    notification_manager: NotificationManager,
    sub: JetStreamContext.PullSubscription,
) -> None:
    """
    Fetch batches from NATS pull consumer, parse protobuf, insert to TimescaleDB, and trigger alerts on failures.
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

                # Trigger notification if probe failed
                if not result.success:
                    await handle_probe_failure(app_db_pool, result, notification_manager)

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
                await insert_monitor_results_batch(timescale_pool, records)
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
    timescale_pool = None
    app_db_pool = None
    nc = None
    try:
        # 1. Initialize DB pools, NotificationManager, and NATS
        timescale_pool = await init_timescale()
        app_db_pool = await init_app_db()
        notification_manager = setup_notification_manager()
        nc, sub = await init_nats()

        # 2. Run consumer loop
        await run_consumer(timescale_pool, app_db_pool, notification_manager, sub)
    except asyncio.CancelledError:
        logger.info("Consumer loop cancelled.")
    except Exception as e:
        logger.critical("Fatal error in main service loop: %s", e, exc_info=True)
    finally:
        logger.info("Draining NATS connection and closing DB pools...")
        if nc and not nc.is_closed:
            await nc.drain()
        if timescale_pool:
            await timescale_pool.close()
        if app_db_pool:
            await app_db_pool.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting pit-wall service.")

