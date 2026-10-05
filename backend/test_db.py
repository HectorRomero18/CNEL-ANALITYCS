# test_db.py
import sys
from sqlalchemy import text
from app.db.session import engine_local, engine_cloud

def probar_conexion_local():
    print("--------------------------------------------------")
    print("1. Probando conexión con BASE DE DATOS LOCAL (PostgreSQL)...")
    try:
        with engine_local.connect() as conn:
            result = conn.execute(text("SELECT version();")).fetchone()
            print("   ✅ Conexión LOCAL Exitosa!")
            print(f"   📌 Versión DB: {result[0]}\n")
            return True
    except Exception as e:
        print("   ❌ ERROR en Conexión LOCAL:")
        print(f"   Detail: {e}\n")
        return False

def probar_conexion_nube():
    print("--------------------------------------------------")
    print("2. Probando conexión con BASE DE DATOS NUBE (SQL Server CNEL)...")
    try:
        with engine_cloud.connect() as conn:
            result = conn.execute(text("SELECT @@VERSION;")).fetchone()
            print("   ✅ Conexión NUBE Exitosa!")
            print(f"   📌 Versión SQL Server: {result[0][:80]}...\n")
            return True
    except Exception as e:
        print("   ❌ ERROR en Conexión NUBE:")
        print(f"   Detail: {e}\n")
        return False

if __name__ == "__main__":
    print("\n🚀 INICIANDO PRUEBA DE CONEXIONES CNEL ANALYTICS...\n")
    ok_local = probar_conexion_local()
    ok_cloud = probar_conexion_nube()

    print("--------------------------------------------------")
    if ok_local and ok_cloud:
        print("🎉 ¡AMBAS CONEXIONES FUNCIONAN CORRECTAMENTE!")
    else:
        print("⚠️ Revisa las credenciales o la red en las conexiones fallidas.")
    print("--------------------------------------------------\n")