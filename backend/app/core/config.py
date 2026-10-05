import os
from urllib.parse import quote_plus
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
    
    @property
    def CLOUD_DATABASE_URL(self) -> str:
        """
        Construye una URL segura para SQL Server codificando credenciales
        y parámetros ODBC mediante urllib.parse.quote_plus.
        """
        odbc_str = (
            f"DRIVER={{{self.CLOUD_DB_DRIVER}}};"
            f"SERVER={self.CLOUD_DB_SERVER};"
            f"DATABASE={self.CLOUD_DB_NAME};"
            f"UID={self.CLOUD_DB_USER};"
            f"PWD={self.CLOUD_DB_PASSWORD};"
            "Encrypt=no;"
            "TrustServerCertificate=yes;"
        )
        return f"mssql+pyodbc:///?odbc_connect={quote_plus(odbc_str)}"

    # --- 2. BASE DE DATOS LOCAL (Usuarios y Roles) ---
    LOCAL_DB_HOST: str = os.getenv("LOCAL_DB_HOST", "localhost")
    LOCAL_DB_PORT: str = os.getenv("LOCAL_DB_PORT", "5432")
    LOCAL_DB_NAME: str = os.getenv("LOCAL_DB_NAME", "")
    LOCAL_DB_USER: str = os.getenv("LOCAL_DB_USER", "")
    LOCAL_DB_PASSWORD: str = os.getenv("LOCAL_DB_PASSWORD", "")
    
    @property
    def LOCAL_DATABASE_URL(self) -> str:
        """
        URL para PostgreSQL codificando usuario y contraseña por seguridad.
        """
        user = quote_plus(self.LOCAL_DB_USER)
        password = quote_plus(self.LOCAL_DB_PASSWORD)
        return f"postgresql+psycopg2://{user}:{password}@{self.LOCAL_DB_HOST}:{self.LOCAL_DB_PORT}/{self.LOCAL_DB_NAME}"

settings = Settings()