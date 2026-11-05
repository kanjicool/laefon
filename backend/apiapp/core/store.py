"""อ่านไฟล์ผลลัพธ์ที่ pipeline เขียนไว้ใน DATA_DIR

ตอนนี้เก็บเป็นไฟล์ JSON ต่อไปถ้าย้ายไป MongoDB ให้เปลี่ยนแค่ module นี้ router ไม่ต้องแก้
"""

import json
import re
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from .config import get_settings

_SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def safe_id(value: str) -> str:
    """กัน path traversal: รหัสเหตุการณ์/รอบต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ - เท่านั้น"""
    if not _SAFE_ID.match(value):
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูล")
    return value


def data_dir() -> Path:
    return get_settings().DATA_DIR


def read_json(*parts: str) -> Any:
    path = data_dir().joinpath(*parts)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูล")
    with path.open(encoding="utf-8") as f:
        return json.load(f)
