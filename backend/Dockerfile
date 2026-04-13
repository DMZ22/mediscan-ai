FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc git git-lfs && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pull LFS files (ML model)
RUN git lfs install && git lfs pull 2>/dev/null || true

RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000
CMD sh -c "python manage.py migrate --noinput 2>&1 && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120"
