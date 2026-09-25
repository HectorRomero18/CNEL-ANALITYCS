from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.routers import clientes, export
from pathlib import Path
from fastapi.responses import FileResponse

app = FastAPI(
    title="CNEL Analytics",
    description="Sistema de consultas históricas de CNEL EP",
    version="1.0.0"
)

# Permitir CORS para solicitudes de red local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conectar routers backend
app.include_router(clientes.router)
app.include_router(export.router)

# Servir Frontend
PROJECT_ROOT = Path(__file__).resolve().parent.parent
app.mount("/static", StaticFiles(directory=PROJECT_ROOT / "frontend"), name="static")

@app.get("/")
def read_root():
    return FileResponse(PROJECT_ROOT / "frontend" / "pages" / "index.html")