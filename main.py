from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Query, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import sqlite3
import os
import shutil
from datetime import datetime

from database import get_db, init_db
from security import hash_password, verify_password, create_access_token, decode_token
from models import UserCreate, UserLogin, TokenResponse, ProgressUpdate

app = FastAPI(title="Biblioteca Digital Personal API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("storage/pdfs", exist_ok=True)
os.makedirs("storage/covers", exist_ok=True)
os.makedirs("static", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/covers", StaticFiles(directory="storage/covers"), name="covers")

security = HTTPBearer(auto_error=False)

@app.on_event("startup")
def on_startup():
    init_db()
    conn = sqlite3.connect(DB_PATH := "database.db")
    admin = conn.execute("SELECT id FROM users WHERE role = 'admin'").fetchone()
    if not admin:
        from security import hash_password
        conn.execute("INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, 'admin', 'approved')",
                     ("admin", hash_password("admin123")))
        conn.commit()
        print("Admin creado: admin / admin123")
    conn.close()

DB_PATH = "database.db"

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalido")
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        user = conn.execute("SELECT id, username, role, status FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.close()
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return dict(user)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return current_user

def log_audit(user_id, username, action, details=None, book_id=None, ip=None):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO audit_log (user_id, username, action, details, book_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, username, action, details, book_id, ip)
    )
    conn.commit()
    conn.close()

@app.get("/")
def read_root():
    return {"status": "Servidor de Biblioteca Digital activo y respondiendo"}

@app.post("/api/register")
def register(user: UserCreate, request: Request):
    conn = sqlite3.connect(DB_PATH)
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (user.username,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    hashed = hash_password(user.password)
    cursor = conn.execute(
        "INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, 'user', 'pending')",
        (user.username, hashed)
    )
    conn.commit()
    conn.close()
    return {"mensaje": "Registro exitoso. Espera a que el administrador apruebe tu acceso.", "username": user.username}

@app.post("/api/token", response_model=TokenResponse)
def login(user: UserLogin, request: Request):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    db_user = conn.execute("SELECT * FROM users WHERE username = ?", (user.username,)).fetchone()
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    token = create_access_token({"sub": db_user["id"], "username": db_user["username"], "role": db_user["role"], "status": db_user["status"]})
    client_ip = request.client.host if request.client else "unknown"
    log_audit(db_user["id"], db_user["username"], "login", f"Inicio de sesion desde {client_ip}", ip=client_ip)
    conn.close()
    return TokenResponse(access_token=token, user_id=db_user["id"], username=db_user["username"])

@app.get("/api/me")
def get_my_info(current_user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    user = conn.execute("SELECT id, username, role, status, created_at FROM users WHERE id = ?", (current_user["id"],)).fetchone()
    conn.close()
    return dict(user)

# ========== ADMIN: Usuarios ==========

@app.get("/api/admin/users")
def list_users(current_user=Depends(require_admin)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    users = conn.execute("SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(u) for u in users]

@app.post("/api/admin/users/{user_id}/approve")
def approve_user(user_id: int, current_user=Depends(require_admin)):
    conn = sqlite3.connect(DB_PATH)
    user = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    conn.execute("UPDATE users SET status = 'approved' WHERE id = ?", (user_id,))
    conn.commit()
    log_audit(current_user["id"], current_user["username"], "approve_user", f"Usuario aprobado: {user[0]}", ip="admin")
    conn.close()
    return {"mensaje": f"Usuario {user[0]} aprobado"}

@app.post("/api/admin/users/{user_id}/reject")
def reject_user(user_id: int, current_user=Depends(require_admin)):
    conn = sqlite3.connect(DB_PATH)
    user = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    conn.execute("UPDATE users SET status = 'rejected' WHERE id = ?", (user_id,))
    conn.commit()
    log_audit(current_user["id"], current_user["username"], "reject_user", f"Usuario rechazado: {user[0]}", ip="admin")
    conn.close()
    return {"mensaje": f"Usuario {user[0]} rechazado"}

# ========== ADMIN: Upload ==========

@app.post("/api/books/upload")
def upload_book(
    file: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form("Desconocido"),
    genre: str = Form("General"),
    year: int = Form(None),
    publisher: str = Form(None),
    isbn: str = Form(None),
    description: str = Form(None),
    current_user=Depends(require_admin)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo archivos PDF")
    pdf_path = f"storage/pdfs/{file.filename}"
    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    import fitz
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    cover_filename = f"{os.path.splitext(file.filename)[0]}.jpg"
    cover_path = f"storage/covers/{cover_filename}"
    first_page = doc[0]
    pix = first_page.get_pixmap(dpi=150)
    pix.save(cover_path)
    doc.close()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        """INSERT INTO books (title, author, genre, year, publisher, isbn, description, total_pages, file_path, cover_path, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, author, genre, year, publisher, isbn, description, total_pages, pdf_path, cover_path, current_user["id"])
    )
    conn.commit()
    log_audit(current_user["id"], current_user["username"], "upload_book",
              f"Subio: {title} ({total_pages} pag)", book_id=cursor.lastrowid, ip="admin")
    conn.close()
    return {"id": cursor.lastrowid, "title": title, "total_pages": total_pages, "cover": cover_path}

# ========== USUARIOS: Catalogo ==========

@app.get("/api/books")
def list_books(
    genre: str = Query(None),
    year: int = Query(None),
    author: str = Query(None),
    q: str = Query(None),
    current_user=Depends(get_current_user)
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    query = """
        SELECT b.id, b.title, b.author, b.genre, b.year, b.publisher, b.isbn, b.description,
               b.total_pages, b.cover_path, b.uploaded_by,
               COALESCE(rp.current_page, 1) AS current_page,
               ROUND((CAST(COALESCE(rp.current_page, 1) AS FLOAT) / b.total_pages) * 100, 1) AS percentage
        FROM books b
        LEFT JOIN reading_progress rp ON b.id = rp.book_id AND rp.user_id = ?
        WHERE 1=1
    """
    params = [current_user["id"]]
    if q:
        query += " AND (b.title LIKE ? OR b.author LIKE ? OR b.genre LIKE ? OR b.publisher LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"])
    if genre:
        query += " AND b.genre = ?"
        params.append(genre)
    if year:
        query += " AND b.year = ?"
        params.append(year)
    if author:
        query += " AND b.author LIKE ?"
        params.append(f"%{author}%")
    query += " ORDER BY b.created_at DESC"
    books = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(b) for b in books]

@app.get("/api/books/genres")
def list_genres(current_user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    genres = conn.execute("SELECT DISTINCT genre FROM books ORDER BY genre").fetchall()
    conn.close()
    return [g[0] for g in genres]

@app.get("/api/books/years")
def list_years(current_user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    years = conn.execute("SELECT DISTINCT year FROM books WHERE year IS NOT NULL ORDER BY year DESC").fetchall()
    conn.close()
    return [y[0] for y in years]

@app.get("/api/books/{book_id}/file")
def get_book_file(book_id: int):
    conn = sqlite3.connect(DB_PATH)
    book = conn.execute("SELECT file_path FROM books WHERE id = ?", (book_id,)).fetchone()
    conn.close()
    if not book:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    from fastapi.responses import FileResponse
    return FileResponse(book[0], media_type="application/pdf")

@app.get("/api/books/{book_id}")
def get_book(book_id: int, current_user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    book = conn.execute("""
        SELECT b.*, COALESCE(rp.current_page, 1) AS current_page
        FROM books b
        LEFT JOIN reading_progress rp ON b.id = rp.book_id AND rp.user_id = ?
        WHERE b.id = ?
    """, (current_user["id"], book_id)).fetchone()
    conn.close()
    if not book:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return dict(book)

# ========== LECTURA ==========

@app.post("/api/progress/{book_id}")
def update_progress(book_id: int, progress: ProgressUpdate, current_user=Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT INTO reading_progress (user_id, book_id, current_page, last_read)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, book_id) DO UPDATE SET
            current_page = excluded.current_page,
            last_read = CURRENT_TIMESTAMP
    """, (current_user["id"], book_id, progress.current_page))
    conn.commit()
    conn.close()
    return {"status": "ok", "current_page": progress.current_page}

# ========== ADMIN: Auditoria ==========

@app.get("/api/admin/audit")
def get_audit_log(current_user=Depends(require_admin)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    logs = conn.execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200").fetchall()
    conn.close()
    return [dict(l) for l in logs]
