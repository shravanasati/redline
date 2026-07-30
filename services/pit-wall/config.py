import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class TimescaleConfig:
    user: str
    password: str
    host: str
    port: str
    db: str

    @property
    def dsn(self) -> str:
        return (
            f"postgres://{self.user}:{self.password}@{self.host}:{self.port}/{self.db}"
        )


def get_timescale_dsn() -> str:
    """
    Validate TimescaleDB environment variables and construct DSN.

    Raises:
        RuntimeError: If any of TIMESCALE_USER, TIMESCALE_PASSWORD, TIMESCALE_HOST,
                      TIMESCALE_PORT, or TIMESCALE_DB are missing or empty.
    """
    required_vars = [
        "TIMESCALE_USER",
        "TIMESCALE_PASSWORD",
        "TIMESCALE_HOST",
        "TIMESCALE_PORT",
        "TIMESCALE_DB",
    ]
    missing = [var for var in required_vars if not os.getenv(var)]

    if missing:
        raise RuntimeError(
            f"Missing required TimescaleDB environment variables: {', '.join(missing)}"
        )

    config = TimescaleConfig(
        user=os.environ["TIMESCALE_USER"],
        password=os.environ["TIMESCALE_PASSWORD"],
        host=os.environ["TIMESCALE_HOST"],
        port=os.environ["TIMESCALE_PORT"],
        db=os.environ["TIMESCALE_DB"],
    )
    return config.dsn


@dataclass(frozen=True)
class NATSConfig:
    url: str
    user: str
    password: str


def get_nats_config() -> NATSConfig:
    """
    Validate NATS environment variables and return NatsConfig.

    Raises:
        RuntimeError: If NATS_USER_ALERTING or NATS_PASS_ALERTING are missing.
    """
    url = os.getenv("NATS_URL", "nats://localhost:4222")
    user = os.getenv("NATS_USER_ALERTING")
    password = os.getenv("NATS_PASS_ALERTING")

    missing = []
    if not user:
        missing.append("NATS_USER_ALERTING")
    if not password:
        missing.append("NATS_PASS_ALERTING")

    if missing:
        raise RuntimeError(
            f"Missing required NATS environment variables: {', '.join(missing)}"
        )

    return NATSConfig(
        url=url,
        user=user,  # type: ignore
        password=password,  # type: ignore
    )
