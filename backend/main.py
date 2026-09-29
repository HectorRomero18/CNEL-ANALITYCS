from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse 
from app.core.decorators import login_required

# Importar context processor
from app.core.context_processors import inject_user

# Routers del backend
from app.routers import clientes, export, auth

app = FastAPI(
    title="CNEL Analytics",
    description="Sistema de consultas históricas de CNEL EP",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas del Backend (API)
app.include_router(clientes.router)
app.include_router(export.router)
app.include_router(auth.router)

# Configuración de Rutas de Archivos
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Servir archivos estáticos (CSS, JS, Imágenes)
app.mount("/static", StaticFiles(directory=PROJECT_ROOT / "frontend"), name="static")

# Configurar motor de plantillas Jinja2
templates = Jinja2Templates(directory=PROJECT_ROOT / "frontend" / "pages")

# REGISTRO GLOBAL DEL CONTEXT PROCESSOR PARA JINJA2
# En FastAPI/Jinja2, context_processors es una lista, no una función invocable.
templates.context_processors = [inject_user]


# --- RUTAS DE VISTAS (FRONTEND) ---

@app.get("/")
def read_root():
    return FileResponse(PROJECT_ROOT / "frontend" / "pages" / "login.html")

@app.get("/dashboard")
@login_required
async def read_dashboard(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="info_cliente.html", 
        context={"active_page": "info-cliente"}
    )

@app.get("/info-cliente")
@login_required
async def get_info_cliente(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="info_cliente.html", 
        context={"active_page": "info-cliente"}
    )

@app.get("/estado-cuenta")
@login_required
async def get_estado_cuenta(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="estado_cuenta.html", 
        context={"active_page": "estado-cuenta"}
    )

@app.get("/estcta-sico")
@login_required
async def get_estcta_sico(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="estado_sico.html", 
        context={"active_page": "estcta-sico"}
    )

@app.get("/consumo")
@login_required
async def get_consumo(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="consumo.html", 
        context={"active_page": "consumo"}
    )

@app.get("/lectura")
@login_required
async def get_lectura(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="lectura.html", 
        context={"active_page": "lectura"}
    )

@app.get("/config")
@login_required
async def get_config(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="config.html", 
        context={"active_page": "config"}
    )