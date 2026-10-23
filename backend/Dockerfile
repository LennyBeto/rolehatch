# backend/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# UID 1000 needs a passwd entry, otherwise libpq-based tools can fail with
# "local user with ID 1000 does not exist" when no DB user is given.
RUN useradd --uid 1000 --no-create-home --shell /usr/sbin/nologin app
USER 1000
EXPOSE 8081
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8081} --workers ${WEB_CONCURRENCY:-2}"]