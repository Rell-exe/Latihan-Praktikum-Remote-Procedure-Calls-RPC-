FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python -m grpc_tools.protoc -I proto --python_out=. --grpc_python_out=. proto/bioskop.proto
ENV PYTHONUNBUFFERED=1
EXPOSE 50051
CMD ["python", "server.py"]
