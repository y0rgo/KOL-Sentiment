from celery import Celery
from app.config import settings

app = Celery("kol_platform", broker=settings.REDIS_URL)
app.config_from_object({
    "task_serializer": "json",
    "result_serializer": "json",
    "accept_content": ["json"],
    "timezone": "UTC",
    "enable_utc": True,
})
