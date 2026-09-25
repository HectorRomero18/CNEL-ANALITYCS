from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
from app.db.session import get_db
from app.routers.clientes import obtener_cliente_completo

router = APIRouter(prefix="/api/export", tags=["Exportación"])

@router.get("/excel/{codigo_cliente}")
def exportar_excel(codigo_cliente: str, db: Session = Depends(get_db)):
    data = obtener_cliente_completo(codigo_cliente, db)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        pd.DataFrame([data["datos_personales"]]).to_excel(writer, sheet_name="Datos Personales", index=False)
        pd.DataFrame(data["estado_cuenta"]).to_excel(writer, sheet_name="Estado de Cuenta", index=False)
        pd.DataFrame(data["estado_sico"]).to_excel(writer, sheet_name="Estado SICO", index=False)
        pd.DataFrame(data["consumos"]).to_excel(writer, sheet_name="Consumos", index=False)
        pd.DataFrame(data["lecturas"]).to_excel(writer, sheet_name="Lecturas", index=False)
        
    output.seek(0)
    filename = f"CNEL_Analytics_{codigo_cliente}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )