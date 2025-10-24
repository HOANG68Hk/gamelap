from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
import threading
import tempfile
import json
import os
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "database.json"
_lock = threading.Lock()

# Đảm bảo file DB tồn tại và hợp lệ
def ensure_db():
    if not DB_FILE.exists():
        DB_FILE.write_text("[]", encoding="utf-8")
    else:
        try:
            json.loads(DB_FILE.read_text(encoding="utf-8"))
        except Exception:
            logging.warning("database.json hỏng, ghi lại thành mảng rỗng")
            DB_FILE.write_text("[]", encoding="utf-8")

ensure_db()

def read_scores():
    with _lock:
        try:
            return json.loads(DB_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            logging.error("Lỗi đọc DB: %s", e)
            DB_FILE.write_text("[]", encoding="utf-8")
            return []

def write_scores(data):
    # Ghi an toàn: ghi file tạm trong cùng thư mục rồi replace
    with _lock:
        tmp = None
        try:
            tmp_fd, tmp_path = tempfile.mkstemp(dir=str(BASE_DIR), prefix="db_", suffix=".tmp")
            tmp = tmp_path
            with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, str(DB_FILE))
        except Exception as e:
            logging.error("Lỗi ghi DB: %s", e)
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except:
                    pass
            raise

class ScoreSubmission(BaseModel):
    name: str = Field(..., min_length=1)
    score: int = Field(ge=0)

@app.get("/")
def home():
    return {"message": "✅ API Flappy Bird đang hoạt động"}

@app.get("/scores")
def get_scores():
    data = read_scores()
    try:
        sorted_data = sorted(data, key=lambda x: int(x.get("score", 0)), reverse=True)[:10]
    except Exception:
        sorted_data = data[:10]
    return sorted_data

@app.post("/submit", status_code=status.HTTP_201_CREATED)
def submit_score(payload: ScoreSubmission):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tên không được trống!")
    score = int(payload.score)
    data = read_scores()
    data.append({"name": name, "score": score})
    write_scores(data)
    return {"message": "Lưu điểm thành công!"}