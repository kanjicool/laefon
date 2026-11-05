# FastAPI, mirrors tent/backend/Dockerfile.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	UV_COMPILE_BYTECODE=1 \
	UV_LINK_MODE=copy \
	APP_ENV=prod \
	DATA_DIR=/data

WORKDIR /app

RUN groupadd --system --gid 1000 app \
	&& useradd --system --uid 1000 --gid app --home /app --shell /usr/sbin/nologin app

COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY apiapp ./apiapp
RUN uv sync --frozen --no-dev && chown -R app:app /app

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 9000
USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:9000/v1/health', timeout=3)"

CMD ["sh", "-c", "fastapi run apiapp/main.py --host 0.0.0.0 --port 9000 --workers ${FASTAPI_WORKERS:-2}"]
