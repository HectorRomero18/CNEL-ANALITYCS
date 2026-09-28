import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "CNEL Analytics"
    PROJECT_VERSION: str = "1.0.0"
    
    # --- JWT / SEGURIDAD ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tu_clave_secreta_super_segura")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # --- 1. BASE DE DATOS NUBE (SQL Server - CNEL) ---
    CLOUD_DB_SERVER: str = os.getenv("CLOUD_DB_SERVER", os.getenv("DB_SERVER", "localhost"))
    CLOUD_DB_NAME: str = os.getenv("CLOUD_DB_NAME", os.getenv("DB_NAME", ""))
    CLOUD_DB_USER: str = os.getenv("CLOUD_DB_USER", os.getenv("DB_USER", ""))
    CLOUD_DB_PASSWORD: str = os.getenv("CLOUD_DB_PASSWORD", os.getenv("DB_PASSWORD", ""))
    CLOUD_DB_DRIVER: str = os.getenv("CLOUD_DB_DRIVER", os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server"))
    
    CLOUD_DATABASE_URL: str = (
        f"mssql+pyodbc://{CLOUD_DB_USER}:{CLOUD_DB_PASSWORD}@{CLOUD_DB_SERVER}/{CLOUD_DB_NAME}?"
        f"driver={CLOUD_DB_DRIVER.replace(' ', '+')}"
    )

    # --- 2. BASE DE DATOS LOCAL (Usuarios y Roles - ej. PostgreSQL o MySQL) ---
    LOCAL_DB_HOST: str = os.getenv("LOCAL_DB_HOST", "localhost")
    LOCAL_DB_PORT: str = os.getenv("LOCAL_DB_PORT", "5432")
    LOCAL_DB_NAME: str = os.getenv("LOCAL_DB_NAME")
    LOCAL_DB_USER: str = os.getenv("LOCAL_DB_USER")
    LOCAL_DB_PASSWORD: str = os.getenv("LOCAL_DB_PASSWORD")
    
    # URL de conexión para SQLAlchemy (ejemplo con PostgreSQL, cambia el motor si usas MySQL o SQLite)
    LOCAL_DATABASE_URL: str = (
        f"postgresql://{LOCAL_DB_USER}:{LOCAL_DB_PASSWORD}@{LOCAL_DB_HOST}:{LOCAL_DB_PORT}/{LOCAL_DB_NAME}"
    )

settings = Settings()