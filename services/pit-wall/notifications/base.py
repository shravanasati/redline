from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class NotificationPayload:
    monitor_id: str
    monitor_name: str
    monitor_type: str
    monitor_endpoint: str
    username: str
    channel_name: str
    channel_type: str
    channel_config: Dict[str, Any]
    event: str  # INCIDENT_OPENED, LATENCY_DEGRADED, INCIDENT_RESOLVED
    error_message: Optional[str]
    timestamp: datetime
    latency_ms: float
    http_status_code: Optional[int]
    worker_region: str


class BaseNotificationChannel(ABC):
    """
    Abstract base class for all notification channel implementations.
    """

    @abstractmethod
    async def send_notification(self, payload: NotificationPayload) -> bool:
        """
        Send a notification to the specified channel.

        Args:
            payload: NotificationPayload containing monitor, result, and channel details.

        Returns:
            bool: True if the notification was delivered successfully, False otherwise.
        """
        pass
