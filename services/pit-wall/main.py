import asyncio
import logging
from datetime import timezone
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
BATCH_SIZE = 100
FETCH_TIMEOUT = 5.0  # seconds — max wait for at least one message from NATS
FLUSH_INTERVAL = 2.0  # seconds — max age of a partial buffer before flushing


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
    Continuously drain NATS into an in-memory buffer and flush to TimescaleDB
    when either the buffer reaches BATCH_SIZE or FLUSH_INTERVAL has elapsed
    since the oldest buffered record. Acks happen after a successful insert.
    """
    logger.info(
        "Started consumer loop. Buffer flushes at %d records or every %.1fs...",
        BATCH_SIZE,
        FLUSH_INTERVAL,
    )

    records: list = []
    msgs: list = []
    buffer_started: float | None = None

    async def flush() -> None:
        nonlocal records, msgs, buffer_started
        if not records:
            return
        batch_len = len(records)
        try:
            await insert_monitor_results_batch(timescale_pool, records)
            logger.info(
                "Persisted batch of %d monitor results to TimescaleDB.", batch_len
            )
            for m in msgs:
                await m.ack()
        finally:
            records = []
            msgs = []
            buffer_started = None

    while True:
        try:
            # If buffer is empty, block waiting for at least one message.
            # If buffer is partial, fetch with a short timeout so we can
            # honor FLUSH_INTERVAL and grow the batch opportunistically.
            timeout = FETCH_TIMEOUT if buffer_started is None else 0.05
            fetched = await sub.fetch(batch=BATCH_SIZE, timeout=timeout)

            now = asyncio.get_event_loop().time()
            for msg in fetched:
                result = MonitorTaskResult()
                result.ParseFromString(msg.data)

                if not result.success:
                    await handle_probe_failure(
                        app_db_pool, result, notification_manager
                    )

                time_val = result.timestamp.ToDatetime(tzinfo=timezone.utc)
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
                msgs.append(msg)

            if buffer_started is None and records:
                buffer_started = now

            # Flush when full, or when the oldest record is older than FLUSH_INTERVAL.
            should_flush = bool(records) and (
                len(records) >= BATCH_SIZE
                or (now - (buffer_started or now)) >= FLUSH_INTERVAL
            )
            if should_flush:
                await flush()

        except (NatsTimeoutError, asyncio.TimeoutError):
            # No new messages arrived in time. If we have a partial buffer
            # older than FLUSH_INTERVAL, flush it.
            if buffer_started is not None:
                age = asyncio.get_event_loop().time() - buffer_started
                if age >= FLUSH_INTERVAL:
                    await flush()
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
