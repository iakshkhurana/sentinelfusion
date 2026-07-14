FROM python:3.12-slim

WORKDIR /app

COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# layout must match Path(__file__).parents[*] in api modules
COPY apps/api /app/apps/api
COPY apps/ml /app/apps/ml
COPY packages/scenarios /app/packages/scenarios
COPY packages/knowledge /app/packages/knowledge

WORKDIR /app/apps/api
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
