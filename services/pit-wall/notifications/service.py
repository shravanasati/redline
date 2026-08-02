import json
import logging
import uuid
import asyncpg

from pb.tasks.results_pb2 import MonitorTaskResult  # type: ignore
from .base import NotificationPayload
from .manager import NotificationManager

logger = logging.getLogger("pit-wall.notifications.service")

NOTIFICATION_QUERY = """
SELECT
  r.monitor_id,
  m.name as monitor_name,
  m.type as monitor_type,
  m.endpoint as monitor_endpoint,
  u.name AS username,
  c.name AS channel_name,
  c.type AS channel_type,
  c.config AS channel_config
FROM
  monitor_notification_rules r
  JOIN notification_channels c ON c.id = r.channel_id
  JOIN "user" u ON c.user_id = u.id
  JOIN monitors m ON m.id = r.monitor_id
WHERE
  r.monitor_id = $1
  AND r.enabled
  AND r.event = $2
  AND c.enabled;
"""


async def init_app_db_pool(dsn: str) -> asyncpg.Pool:
    """Create and return an asyncpg connection pool for the Application database."""
    logger.info("Creating Application PostgreSQL DB connection pool...")
    return await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10)


def classify_event(error_message: str | None) -> str:
    """
    Classify event type based on probe result error message.
    Differentiates LATENCY_DEGRADED from INCIDENT_OPENED based on response_time assertion failure.
    """
    if error_message and error_message.startswith("assertion failed: response_time "):
        return "LATENCY_DEGRADED"
    return "INCIDENT_OPENED"


async def handle_probe_failure(
    app_db_pool: asyncpg.Pool,
    result: MonitorTaskResult,
    manager: NotificationManager,
) -> None:
    """
    Query notification rules and dispatch alerts for a failed probe task result.
    """
    if result.success:
        return

    error_msg = result.error_message if result.error_message else None
    event = classify_event(error_msg)
    monitor_id_str = result.id

    try:
        # Convert to UUID object for asyncpg UUID parameter binding if valid UUID
        try:
            param_monitor_id = uuid.UUID(monitor_id_str)
        except ValueError:
            param_monitor_id = monitor_id_str

        async with app_db_pool.acquire() as conn:
            rows = await conn.fetch(NOTIFICATION_QUERY, param_monitor_id, event)

        if not rows:
            logger.debug(
                "No active notification rules found for monitor_id '%s' (Event: %s).",
                monitor_id_str,
                event,
            )
            return

        time_val = result.timestamp.ToDatetime()
        latency_ms = result.latency.ToTimedelta().total_seconds() * 1000.0
        http_status = (
            result.http_status_code if result.http_status_code != 0 else None
        )
        worker_reg = result.worker_region if result.worker_region else "unknown"

        for row in rows:
            config_data = row["channel_config"]
            if isinstance(config_data, str):
                try:
                    config_data = json.loads(config_data)
                except Exception as e:
                    logger.error("Failed to parse channel_config JSON string: %s", e)
                    config_data = {}
            elif not isinstance(config_data, dict):
                config_data = {}

            payload = NotificationPayload(
                monitor_id=str(row["monitor_id"]),
                monitor_name=row["monitor_name"],
                monitor_type=row["monitor_type"],
                monitor_endpoint=row["monitor_endpoint"],
                username=row["username"],
                channel_name=row["channel_name"],
                channel_type=row["channel_type"],
                channel_config=config_data,
                event=event,
                error_message=error_msg,
                timestamp=time_val,
                latency_ms=latency_ms,
                http_status_code=http_status,
                worker_region=worker_reg,
            )

            await manager.dispatch(payload)

    except Exception as e:
        logger.error(
            "Error querying notification rules or dispatching alerts for monitor_id '%s': %s",
            monitor_id_str,
            e,
            exc_info=True,
        )
