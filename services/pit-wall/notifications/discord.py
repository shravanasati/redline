import json
import logging
from typing import Any, Dict
import niquests

from config import get_dashboard_url
from .base import BaseNotificationChannel, NotificationPayload

logger = logging.getLogger("pit-wall.notifications.discord")


class DiscordNotificationChannel(BaseNotificationChannel):
    """
    Discord webhook notification channel implementation.
    """

    async def send_notification(self, payload: NotificationPayload) -> bool:
        config = payload.channel_config
        if isinstance(config, str):
            try:
                config = json.loads(config)
            except Exception as e:
                logger.error("Failed to parse Discord channel_config JSON: %s", e)
                return False

        webhook_url = config.get("webhookUrl") or config.get("webhook_url")
        if not webhook_url:
            logger.error(
                "Missing 'webhookUrl' in channel_config for channel '%s' (User: %s)",
                payload.channel_name,
                payload.username,
            )
            return False

        dashboard_url = get_dashboard_url()
        monitor_link = f"{dashboard_url}/dashboard/monitors/{payload.monitor_id}"

        is_latency = payload.event == "LATENCY_DEGRADED"
        color = 0xE67E22 if is_latency else 0xE74C3C  # Orange for latency degradation, Red for incident
        title_prefix = "⚠️ Latency Degraded" if is_latency else "🚨 Incident Opened"

        fields = [
            {"name": "Monitor", "value": f"[{payload.monitor_name}]({monitor_link}) (`{payload.monitor_type}`)", "inline": True},
            {"name": "Endpoint", "value": f"`{payload.monitor_endpoint}`", "inline": True},
            {"name": "Region", "value": f"`{payload.worker_region}`", "inline": True},
            {"name": "Latency", "value": f"{payload.latency_ms:.2f} ms", "inline": True},
        ]

        if payload.http_status_code is not None:
            fields.append({"name": "HTTP Status", "value": str(payload.http_status_code), "inline": True})

        fields.append({"name": "User", "value": payload.username, "inline": True})
        fields.append({"name": "Error Message", "value": f"```{payload.error_message or 'No error message provided'}```", "inline": False})
        fields.append({"name": "Dashboard Link", "value": f"[View Monitor Details]({monitor_link})", "inline": False})

        embed: Dict[str, Any] = {
            "title": f"{title_prefix}: {payload.monitor_name}",
            "url": monitor_link,
            "description": f"Monitor [**{payload.monitor_name}**]({monitor_link}) failed check for event **{payload.event}**.",
            "color": color,
            "fields": fields,
            "timestamp": payload.timestamp.isoformat(),
            "footer": {"text": f"Redline Pit-Wall | Channel: {payload.channel_name}"},
        }


        discord_payload = {
            "username": "Redline Alerts",
            "embeds": [embed],
        }

        try:
            async with niquests.AsyncSession() as session:
                resp = await session.post(webhook_url, json=discord_payload, timeout=10.0)
                if resp.status_code in (200, 204):
                    logger.info(
                        "Successfully sent Discord notification for monitor '%s' (%s) to user '%s'.",
                        payload.monitor_name,
                        payload.event,
                        payload.username,
                    )
                    return True
                else:
                    logger.error(
                        "Discord webhook HTTP %d error: %s",
                        resp.status_code,
                        resp.text,
                    )
                    return False
        except Exception as e:
            logger.error(
                "Exception when sending Discord notification to %s: %s",
                webhook_url,
                e,
                exc_info=True,
            )
            return False
