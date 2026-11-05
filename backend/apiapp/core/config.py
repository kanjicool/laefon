from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "dev"
    TITLE: str = "Laefon API"
    VERSION: str = "0.1.0"

    # โฟลเดอร์ที่ pipeline เขียนผลทำนาย (forecast.json, radar.json, ภาพเรดาร์ ฯลฯ)
    DATA_DIR: Path = Path("../data/generated")

    # ข้อมูลจำลอง: เลื่อนเวลาของรอบ "ล่าสุด" ให้ตรงกับเวลาจริง demo จะได้ไม่ขึ้นว่าข้อมูลเก่า
    # มีผลเฉพาะไฟล์ที่ is_mock = true
    MOCK_LIVE_CLOCK: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
