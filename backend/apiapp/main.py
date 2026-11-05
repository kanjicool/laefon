from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from loguru import logger

from .core.config import get_settings
from .modules.areas.router import router as areas_router
from .modules.forecast.router import router as forecast_router
from .modules.health.router import router as health_router
from .modules.metrics.router import router as metrics_router
from .modules.replay.router import router as replay_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.TITLE, version=settings.VERSION)
    for router in (health_router, forecast_router, replay_router, areas_router, metrics_router):
        app.include_router(router)

    # check_dir=False: the API may start before the pipeline has written anything.
    app.mount(
        "/v1/files",
        StaticFiles(directory=settings.DATA_DIR, check_dir=False),
        name="files",
    )
    logger.info(f"APP_ENV={settings.APP_ENV} DATA_DIR={settings.DATA_DIR}")
    return app


app = create_app()
