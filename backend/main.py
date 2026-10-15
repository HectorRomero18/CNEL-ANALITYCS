from pathlib import Path
from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from app.core.decorators import login_required
from app.db.session import get_db, get_local_db
from app.routers import admin


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

# Exception handler para errores de conexión a BD
@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": f"Error de conexión a base de datos: {str(exc)}"}
    )

# Rutas del Backend (API)
app.include_router(clientes.router)
app.include_router(export.router)
app.include_router(auth.router)
app.include_router(admin.router)
# Configuración de Rutas de Archivos
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Servir solo los recursos estáticos; las plantillas no deben ser accesibles como archivos.
for asset_dir in ("css", "js", "img"):
    app.mount(
        f"/static/{asset_dir}",
        StaticFiles(directory=PROJECT_ROOT / "frontend" / asset_dir),
        name=f"static-{asset_dir}",
    )

# Configurar motor de plantillas Jinja2
templates = Jinja2Templates(directory=PROJECT_ROOT / "frontend" / "pages")

# REGISTRO GLOBAL DEL CONTEXT PROCESSOR PARA JINJA2
# En FastAPI/Jinja2, context_processors es una lista, no una función invocable.
templates.context_processors = [inject_user]


# --- RUTAS DE VISTAS (FRONTEND) ---

@app.get("/")
def read_root(request: Request, db: Session = Depends(get_local_db)):
    user = auth.get_current_user_optional(
        request=request,
        token_header=None,
        db=db,
    )
    if user:
        response = RedirectResponse(url="/dashboard", status_code=303)
    else:
        response = FileResponse(PROJECT_ROOT / "frontend" / "pages" / "login.html")

    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/dashboard")
@login_required
def read_dashboard(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="info_cliente.html", 
        context={"active_page": "info-cliente"}
    )

@app.get("/info-cliente")
@login_required
def get_info_cliente(request: Request, codigo: str = None, db: Session = Depends(get_db)):
    context = {"active_page": "info-cliente"}
    
    if codigo:
        datos_cliente = clientes.obtener_cliente_completo(codigo, db)
        if datos_cliente:
            context["initial_data"] = jsonable_encoder(datos_cliente)
            context["codigo_cliente"] = codigo
    
    return templates.TemplateResponse(
        request=request, 
        name="info_cliente.html", 
        context=context
    )

@app.get("/estado-cuenta")
@login_required
def get_estado_cuenta(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="estado_cuenta.html", 
        context={"active_page": "estado-cuenta"}
    )

@app.get("/consumo")
@login_required
def get_consumo(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="consumo.html", 
        context={"active_page": "consumo"}
    )

@app.get("/lectura")
@login_required
def get_lectura(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="lectura.html", 
        context={"active_page": "lectura"}
    )

@app.get("/config")
@login_required
def get_config(request: Request, db: Session = Depends(get_local_db)):
    user = auth.get_current_user_optional(request=request, token_header=None, db=db)
    if not user or user.get("rol", "").upper() not in ["ADMIN", "ADMINISTRADOR"]:
        return RedirectResponse(url="/dashboard", status_code=303)

    roles = db.execute(text("SELECT id, nombre FROM roles ORDER BY nombre")).fetchall()
    return templates.TemplateResponse(
        request=request, 
        name="admin_usuarios.html", 
        context={"active_page": "config", "roles": roles}
    )