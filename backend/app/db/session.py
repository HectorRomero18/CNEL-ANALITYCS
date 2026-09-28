from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 1. Motor para la BD Local (Usuarios y Roles)
engine_local = create_engine(settings.LOCAL_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_local)

# 2. Motor para la BD Nube (SQL Server - CNEL)
engine_cloud = create_engine(settings.CLOUD_DATABASE_URL, pool_pre_ping=True)
SessionCloud = sessionmaker(autocommit=False, autoflush=False, bind=engine_cloud)

# Dependency para obtener sesión de BD Nube (Clientes/Consumos)
def get_db():
    db = SessionCloud()
    try:
        yield db
    finally:
        db.close()

# Dependency para obtener sesión de BD Local (Usuarios/Roles)
def get_local_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()