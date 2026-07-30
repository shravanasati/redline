import logging
from typing import Sequence, Tuple, Any
import asyncpg

logger = logging.getLogger("pit-wall.db")


async def init_timescale_pool(dsn: str) -> asyncpg.Pool:
    """Create and return an asyncpg connection pool."""
    logger.info("Creating TimescaleDB connection pool...")
    return await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10)


async def init_timescale_schema(pool: asyncpg.Pool) -> None:
    """Initialize TimescaleDB extension, hypertable, continuous aggregates, and policies idempotently."""
    logger.info("Initializing TimescaleDB schema and hypertables...")
    async with pool.acquire() as conn:
        # 1. Enable TimescaleDB extension
        await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

        # 2. Base table for monitor task results
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS monitor_results (
                timestamp         TIMESTAMPTZ      NOT NULL,
                monitor_id        TEXT             NOT NULL,
                success           BOOLEAN          NOT NULL,
                latency_ms        DOUBLE PRECISION NOT NULL,
                http_status_code  SMALLINT         NULL,
                worker_region     VARCHAR(32)      NOT NULL,
                error_message     TEXT             NULL
            );
        """)

        # 3. Convert table to hypertable
        await conn.execute("""
            SELECT create_hypertable('monitor_results', 'timestamp', if_not_exists => TRUE);
        """)

        # 4. Create primary lookup indexes
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_monitor_results_id_time 
                ON monitor_results (monitor_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_monitor_results_region_time 
                ON monitor_results (worker_region, timestamp DESC);
        """)

        # 5. Create 1-minute Continuous Aggregate
        await conn.execute("""
            CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_results_1m
            WITH (timescaledb.continuous) AS
            SELECT
                time_bucket('1 minute', timestamp) AS bucket,
                monitor_id,
                worker_region,
                COUNT(*) AS total_checks,
                COUNT(*) FILTER (WHERE success = TRUE) AS success_checks,
                COUNT(*) FILTER (WHERE success = FALSE) AS failed_checks,
                AVG(latency_ms) AS avg_latency_ms,
                MIN(latency_ms) AS min_latency_ms,
                MAX(latency_ms) AS max_latency_ms,
                percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms,
                percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_latency_ms,
                COUNT(*) FILTER (WHERE http_status_code >= 200 AND http_status_code < 300) AS count_2xx,
                COUNT(*) FILTER (WHERE http_status_code >= 400 AND http_status_code < 500) AS count_4xx,
                COUNT(*) FILTER (WHERE http_status_code >= 500) AS count_5xx,
                COUNT(*) FILTER (WHERE http_status_code IS NULL AND success = FALSE) AS count_net_errors
            FROM monitor_results
            GROUP BY bucket, monitor_id, worker_region;
        """)

        # Add refresh policy for 1-minute continuous aggregate
        try:
            await conn.execute("""
                SELECT add_continuous_aggregate_policy('monitor_results_1m',
                    start_offset => INTERVAL '1 hour',
                    end_offset   => INTERVAL '1 minute',
                    schedule_interval => INTERVAL '1 minute',
                    if_not_exists => TRUE);
            """)
        except Exception as e:
            logger.debug("Continuous aggregate policy (1m) notice: %s", e)

        # 6. Create 1-hour Continuous Aggregate
        await conn.execute("""
            CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_results_1h
            WITH (timescaledb.continuous) AS
            SELECT
                time_bucket('1 hour', timestamp) AS bucket,
                monitor_id,
                COUNT(*) AS total_checks,
                COUNT(*) FILTER (WHERE success = TRUE) AS success_checks,
                COUNT(*) FILTER (WHERE success = FALSE) AS failed_checks,
                AVG(latency_ms) AS avg_latency_ms,
                percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms
            FROM monitor_results
            GROUP BY bucket, monitor_id;
        """)

        # Add refresh policy for 1-hour continuous aggregate
        try:
            await conn.execute("""
                SELECT add_continuous_aggregate_policy('monitor_results_1h',
                    start_offset => INTERVAL '1 day',
                    end_offset   => INTERVAL '1 hour',
                    schedule_interval => INTERVAL '1 hour',
                    if_not_exists => TRUE);
            """)
        except Exception as e:
            logger.debug("Continuous aggregate policy (1h) notice: %s", e)

        # 7. Enable compression & retention policies
        try:
            await conn.execute("""
                ALTER TABLE monitor_results SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'monitor_id, worker_region',
                    timescaledb.compress_orderby = 'timestamp DESC'
                );
            """)
        except Exception as e:
            logger.debug("Compression settings notice: %s", e)

        try:
            await conn.execute("""
                SELECT add_compression_policy('monitor_results', INTERVAL '7 days', if_not_exists => TRUE);
            """)
        except Exception as e:
            logger.debug("Compression policy notice: %s", e)

        try:
            await conn.execute("""
                SELECT add_retention_policy('monitor_results', INTERVAL '90 days', if_not_exists => TRUE);
            """)
        except Exception as e:
            logger.debug("Retention policy notice: %s", e)

    logger.info("TimescaleDB schema initialization complete.")


async def insert_monitor_results_batch(
    pool: asyncpg.Pool, records: Sequence[Tuple[Any, ...]]
) -> None:
    """Bulk insert monitor task result tuples into TimescaleDB."""
    if not records:
        return

    query = """
        INSERT INTO monitor_results (
            timestamp, monitor_id, success, latency_ms, http_status_code, worker_region, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    """
    async with pool.acquire() as conn:
        await conn.executemany(query, records)
