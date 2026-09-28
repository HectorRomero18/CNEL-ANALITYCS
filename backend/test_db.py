from app.db.session import engine_local
from sqlalchemy import text

try:
    # Intenta realizar una conexión directa a la BD Local
    with engine_local.connect() as connection:
        result = connection.execute(text("SELECT current_database(), current_user;"))
        db_name, db_user = result.fetchone()
        print("\n Muestra de Éxito:")
        print(f" Conectado exitosamente a la BD Local: '{db_name}' como el usuario: '{db_user}'\n")
except Exception as e:
    print("\n Error de conexión:")
    print(f"❌ No se pudo conectar a la BD local. Detalle:\n{e}\n")