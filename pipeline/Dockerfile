# pipeline (ตอนนี้: สร้างข้อมูลจำลอง) — Python 3.12 เพราะ library ML/เรดาร์ยังไม่รองรับ 3.14 ครบ
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	UV_COMPILE_BYTECODE=1 \
	UV_LINK_MODE=copy

WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY laefon_pipeline ./laefon_pipeline
COPY reference ./reference
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"
CMD ["python", "-m", "laefon_pipeline.mock", "--out", "/data"]
