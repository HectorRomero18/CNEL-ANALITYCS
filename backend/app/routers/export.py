from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.utils import get_column_letter
import pandas as pd
import io
from app.db.session import get_db
from app.routers.clientes import obtener_cliente_completo

router = APIRouter(prefix="/api/export", tags=["Exportación"])


HEADER_LABELS = {
    "codigo_cliente": "Código de cliente",
    "nombre": "Nombre",
    "cedula": "Cédula",
    "fecha_instalacion": "Fecha de instalación",
    "direccion": "Dirección",
    "telefono": "Teléfono",
    "medidor": "Medidor",
    "marca": "Marca",
    "serie": "Serie",
    "modelo_medidor": "Modelo del medidor",
    "consumo_promedio": "Consumo promedio (kWh)",
    "meses_deuda": "Meses de deuda",
    "deuda_sap": "Deuda SAP",
    "deuda_convenio": "Deuda del convenio",
    "num_partes_convenio": "Partes del convenio",
    "fecha_convenio": "Fecha del convenio",
    "obs_convenio": "Observación del convenio",
    "fecha": "Fecha",
    "tipo_evento": "Tipo de evento",
    "codigo_evento": "Código de evento",
    "factura": "Factura",
    "valor": "Valor",
    "saldo": "Saldo",
    "estado_sico": "Estado SICO",
    "periodo": "Período",
    "kwh": "Energía activa (kWh)",
    "kwh_reactiva": "Energía reactiva (kvarh)",
    "dias_facturados": "Días facturados",
    "cx_cliente": "Código de cliente",
    "cx_nummed": "Medidor",
    "fx_tomalec": "Fecha de lectura",
    "qx_ultlec": "Lectura anterior",
    "qx_tomalec": "Lectura tomada",
    "qx_factlec": "Lectura facturada",
    "consumo_kwh": "Consumo calculado (kWh)",
    "tp_lectura": "Código de tipo de lectura",
    "tipo_lectura_desc": "Tipo de lectura",
    "cx_observa": "Código de observación",
    "observacion_desc": "Observación",
    "cx_tipo": "Tipo de registro",
}


def format_worksheet(worksheet, table_name: str, key_value: bool = False) -> None:
    worksheet.freeze_panes = "A2"
    worksheet.sheet_view.showGridLines = False
    worksheet.row_dimensions[1].height = 30

    for cell in worksheet[1]:
        cell.fill = PatternFill("solid", fgColor="243B64")
        cell.font = Font(name="Aptos", color="FFFFFF", bold=True, size=11)
        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        cell.border = Border(bottom=Side(style="medium", color="6D83AC"))

    for row in worksheet.iter_rows(min_row=2):
        worksheet.row_dimensions[row[0].row].height = 24
        for cell in row:
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            if cell.row % 2 == 1:
                cell.fill = PatternFill("solid", fgColor="F1F5FB")
            if cell.is_date:
                cell.number_format = "dd/mm/yyyy"
            elif isinstance(cell.value, (int, float)) and not isinstance(cell.value, bool):
                cell.number_format = "#,##0.00" if isinstance(cell.value, float) else "#,##0"

            if key_value:
                cell.alignment = Alignment(
                    horizontal="left" if cell.column == 1 else "right",
                    vertical="center",
                    wrap_text=True,
                )

    if worksheet.max_column:
        worksheet.auto_filter.ref = worksheet.dimensions
        for column_index in range(1, worksheet.max_column + 1):
            column_letter = get_column_letter(column_index)
            if key_value:
                width = 34 if column_index == 1 else 48
            else:
                values = [
                    len(str(worksheet.cell(row=row, column=column_index).value or ""))
                    for row in range(1, worksheet.max_row + 1)
                ]
                width = min(max(max(values, default=12) + 3, 16), 42)
            worksheet.column_dimensions[column_letter].width = width

    if worksheet.max_row > 1 and worksheet.max_column:
        table = Table(
            displayName=f"Tabla{table_name.replace(' ', '')}",
            ref=worksheet.dimensions,
        )
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2",
            showFirstColumn=False,
            showLastColumn=False,
            showRowStripes=True,
            showColumnStripes=False,
        )
        worksheet.add_table(table)

    if not key_value:
        saldo_columns = [
            cell.column
            for cell in worksheet[1]
            if cell.value == "Saldo"
        ]
        for column_index in saldo_columns:
            for row_index in range(2, worksheet.max_row + 1):
                worksheet.cell(row=row_index, column=column_index).number_format = "0.00"


@router.get("/excel/{codigo_cliente}")
def exportar_excel(codigo_cliente: str, db: Session = Depends(get_db)):
    data = obtener_cliente_completo(codigo_cliente, db)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        personal = data["datos_personales"]
        personal_rows = [
            {
                "Campo": HEADER_LABELS.get(field, field.replace("_", " ").capitalize()),
                "Valor": value,
            }
            for field, value in personal.items()
        ]
        personal_frame = pd.DataFrame(personal_rows, columns=["Campo", "Valor"])
        personal_frame.to_excel(writer, sheet_name="Datos Personales", index=False)
        format_worksheet(writer.sheets["Datos Personales"], "DatosPersonales", key_value=True)

        sheets = [
            ("Estado de Cuenta", data["estado_cuenta"], ["fecha", "tipo_evento", "codigo_evento", "factura", "valor", "saldo"]),
            ("Estado SICO", data["estado_sico"], ["fecha", "estado_sico", "codigo_evento", "factura", "valor", "saldo"]),
            ("Consumos", data["consumos"], ["periodo", "kwh", "kwh_reactiva", "dias_facturados"]),
            ("Lecturas", data["lecturas"], ["cx_cliente", "cx_nummed", "fx_tomalec", "qx_ultlec", "qx_tomalec", "qx_factlec", "consumo_kwh", "tp_lectura", "tipo_lectura_desc", "cx_observa", "observacion_desc", "cx_tipo"]),
        ]
        for sheet_name, rows, columns in sheets:
            frame = pd.DataFrame(rows, columns=columns)
            frame.rename(columns=HEADER_LABELS, inplace=True)
            frame.to_excel(writer, sheet_name=sheet_name, index=False)
            format_worksheet(
                writer.sheets[sheet_name],
                sheet_name.replace(" ", ""),
            )
        
    output.seek(0)
    filename = f"CNEL_Analytics_{codigo_cliente}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )