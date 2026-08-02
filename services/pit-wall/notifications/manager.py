import logging
from typing import Dict

from .base import BaseNotificationChannel, NotificationPayload

logger = logging.getLogger("pit-wall.notifications.manager")


class NotificationManager:
    """
    Registry and dispatcher for notification channels.
    """

    def __init__(self) -> None:
        self._channels: Dict[str, BaseNotificationChannel] = {}

    def register_channel(self, channel_type: str, channel_instance: BaseNotificationChannel) -> None:
        """Register a notification channel instance for a specific channel_type."""
        self._channels[channel_type.lower()] = channel_instance
        logger.info("Registered notification channel handler for type: '%s'", channel_type.lower())

    async def dispatch(self, payload: NotificationPayload) -> bool:
        """
        Dispatch notification payload to the matching channel handler.
        """
        channel_type = payload.channel_type.lower()
        handler = self._channels.get(channel_type)
        if not handler:
            logger.warning(
                "No registered notification channel handler found for channel_type '%s'. Skipping alert for monitor '%s'.",
                payload.channel_type,
                payload.monitor_name,
            )
            return False

        return await handler.send_notification(payload)
