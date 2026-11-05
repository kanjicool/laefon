from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "dev"
    TITLE: str = "Laefon API"
    VERSION: str = "0.1.0"

    # Where the pipeline writes its output.
    DATA_DIR: Path = Path("../data/generated")

    # Shift mock "latest" timestamps to now so the demo never looks stale (is_mock only).
    MOCK_LIVE_CLOCK: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
