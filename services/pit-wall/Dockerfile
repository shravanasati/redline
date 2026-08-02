FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN addgroup --system --gid 1000 appuser && \
    adduser --system --uid 1000 --gid 1000 --home /home/appuser appuser && \
    mkdir -p /home/appuser && \
    chown appuser:appuser /home/appuser

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_HTTP_TIMEOUT=300 \
    PYTHONUNBUFFERED="true" \
    HOME="/home/appuser"

RUN echo "pit-wall" > README.md
COPY pyproject.toml uv.lock* ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

COPY . /app/


ENV PATH="/app/.venv/bin:$PATH"

USER appuser

CMD ["/app/.venv/bin/python", "main.py"]