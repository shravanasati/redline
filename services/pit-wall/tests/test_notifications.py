from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from config import get_app_db_dsn, get_dashboard_url, get_timescale_dsn
from notifications import (
    BaseNotificationChannel,
    DiscordNotificationChannel,
    NotificationManager,
    NotificationPayload,
    classify_event,
    handle_probe_failure,
)
from pb.tasks.results_pb2 import MonitorTaskResult  # type: ignore


def test_classify_event():
    assert classify_event("assertion failed: response_time 500ms is not less than 200ms") == "LATENCY_DEGRADED"
    assert classify_event("http request failed: connection refused") == "INCIDENT_OPENED"
    assert classify_event("unexpected HTTP status: 500 Internal Server Error") == "INCIDENT_OPENED"
    assert classify_event(None) == "INCIDENT_OPENED"


def test_get_dashboard_url(monkeypatch):
    monkeypatch.delenv("DASHBOARD_URL", raising=False)
    assert get_dashboard_url() == "http://localhost:3000"

    monkeypatch.setenv("DASHBOARD_URL", "https://redline.example.com")
    assert get_dashboard_url() == "https://redline.example.com"

    monkeypatch.setenv("DASHBOARD_URL", "dashboard.internal:8080")
    assert get_dashboard_url() == "http://dashboard.internal:8080"


def test_config_dsn_fallback(monkeypatch):
    # Test Timescale URL priority
    monkeypatch.setenv("TIMESCALE_URL", "postgres://user:pass@timescalehost:5433/mydb")
    assert get_timescale_dsn() == "postgres://user:pass@timescalehost:5433/mydb"

    # Test App DB DSN fallback
    monkeypatch.delenv("POSTGRES_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("POSTGRES_USER", "myuser")
    monkeypatch.setenv("POSTGRES_PASSWORD", "mypass")
    monkeypatch.setenv("POSTGRES_HOST", "myhost")
    monkeypatch.setenv("POSTGRES_PORT", "5432")
    monkeypatch.setenv("POSTGRES_DB", "mydb")
    assert get_app_db_dsn() == "postgres://myuser:mypass@myhost:5432/mydb"

    # Test POSTGRES_URL priority
    monkeypatch.setenv("POSTGRES_URL", "postgresql://user:pass@appdbhost:5432/appdb")
    assert get_app_db_dsn() == "postgresql://user:pass@appdbhost:5432/appdb"



@pytest.mark.asyncio
async def test_notification_manager_dispatch():
    manager = NotificationManager()
    dummy_channel = AsyncMock(spec=BaseNotificationChannel)
    dummy_channel.send_notification.return_value = True

    manager.register_channel("discord", dummy_channel)

    payload = NotificationPayload(
        monitor_id="019f1966-544d-7831-897a-9c5eb5afd022",
        monitor_name="API Gateway",
        monitor_type="http",
        monitor_endpoint="https://api.example.com/health",
        username="shravan",
        channel_name="Alerts Channel",
        channel_type="discord",
        channel_config={"webhookUrl": "https://discord.com/api/webhooks/123/abc"},
        event="INCIDENT_OPENED",
        error_message="unexpected HTTP status: 502 Bad Gateway",
        timestamp=datetime.now(timezone.utc),
        latency_ms=120.5,
        http_status_code=502,
        worker_region="us-east",
    )

    success = await manager.dispatch(payload)
    assert success is True
    dummy_channel.send_notification.assert_called_once_with(payload)


@pytest.mark.asyncio
async def test_discord_channel_send_success():
    channel = DiscordNotificationChannel()
    payload = NotificationPayload(
        monitor_id="019f1966-544d-7831-897a-9c5eb5afd022",
        monitor_name="API Gateway",
        monitor_type="http",
        monitor_endpoint="https://api.example.com/health",
        username="shravan",
        channel_name="Alerts Channel",
        channel_type="discord",
        channel_config={"webhookUrl": "https://discord.com/api/webhooks/test"},
        event="LATENCY_DEGRADED",
        error_message="assertion failed: response_time 350ms is not less than 200ms",
        timestamp=datetime.now(timezone.utc),
        latency_ms=350.0,
        http_status_code=200,
        worker_region="us-west",
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 204

    mock_session = AsyncMock()
    mock_session.post.return_value = mock_resp
    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None

    with patch("niquests.AsyncSession", return_value=mock_session):
        success = await channel.send_notification(payload)
        assert success is True
        mock_session.post.assert_called_once()


@pytest.mark.asyncio
async def test_discord_channel_missing_webhook():
    channel = DiscordNotificationChannel()
    payload = NotificationPayload(
        monitor_id="019f1966-544d-7831-897a-9c5eb5afd022",
        monitor_name="API Gateway",
        monitor_type="http",
        monitor_endpoint="https://api.example.com/health",
        username="shravan",
        channel_name="Alerts Channel",
        channel_type="discord",
        channel_config={},  # Missing webhookUrl
        event="INCIDENT_OPENED",
        error_message="Failed",
        timestamp=datetime.now(timezone.utc),
        latency_ms=100.0,
        http_status_code=None,
        worker_region="us-east",
    )

    success = await channel.send_notification(payload)
    assert success is False


@pytest.mark.asyncio
async def test_handle_probe_failure_queries_db_and_dispatches():
    mock_pool = MagicMock()
    mock_conn = AsyncMock()

    # Mock DB returning a notification rule row
    mock_row = {
        "monitor_id": "019f1966-544d-7831-897a-9c5eb5afd022",
        "monitor_name": "Database API",
        "monitor_type": "http",
        "monitor_endpoint": "https://db.example.com",
        "username": "admin",
        "channel_name": "Slack Alerts",
        "channel_type": "discord",
        "channel_config": '{"webhookUrl": "https://discord.com/api/webhooks/test"}',
    }
    mock_conn.fetch.return_value = [mock_row]

    # Context manager setup for pool.acquire()
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn
    mock_pool.acquire.return_value.__aexit__.return_value = None

    manager = AsyncMock(spec=NotificationManager)

    res = MonitorTaskResult()
    res.id = "019f1966-544d-7831-897a-9c5eb5afd022"
    res.success = False
    res.error_message = "connection refused"
    res.timestamp.GetCurrentTime()
    res.latency.FromMilliseconds(45)

    await handle_probe_failure(mock_pool, res, manager)

    assert manager.dispatch.call_count == 1
    dispatched_payload = manager.dispatch.call_args[0][0]
    assert dispatched_payload.monitor_name == "Database API"
    assert dispatched_payload.event == "INCIDENT_OPENED"
    assert dispatched_payload.channel_config == {"webhookUrl": "https://discord.com/api/webhooks/test"}
