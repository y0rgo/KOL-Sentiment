from celery import Celery
from app.config import settings

app = Celery("kol_platform", broker=settings.redis_url, backend=settings.redis_url)
app.autodiscover_tasks(["app.tasks"])
