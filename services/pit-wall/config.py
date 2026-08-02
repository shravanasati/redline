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
    Checks TIMESCALE_URL first; if unavailable, falls back to individual variables.

    Raises:
        RuntimeError: If TIMESCALE_URL is not set and any of TIMESCALE_USER, TIMESCALE_PASSWORD,
                      TIMESCALE_HOST, TIMESCALE_PORT, or TIMESCALE_DB are missing or empty.
    """
    url = os.getenv("TIMESCALE_URL")
    if url:
        return url

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
class PostgresConfig:
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


def get_app_db_dsn() -> str:
    """
    Validate Application PostgreSQL environment variables and construct DSN.
    Checks POSTGRES_URL or DATABASE_URL first; if unavailable, falls back to individual variables.

    Raises:
        RuntimeError: If no DSN URL or required components are provided.
    """
    url = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")
    if url:
        return url

    config = PostgresConfig(
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "passwordhaha"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
        db=os.getenv("POSTGRES_DB", "redline"),
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


def get_dashboard_url() -> str:
    """
    Get dashboard URL from environment variable DASHBOARD_URL.
    Defaults to 'http://localhost:3000' if not present.
    """
    url = os.getenv("DASHBOARD_URL", "http://localhost:3000").strip().rstrip("/")
    if not url.startswith(("http://", "https://")):
        url = f"http://{url}"
    return url

