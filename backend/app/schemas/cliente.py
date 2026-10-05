from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal


class ClienteBase(BaseModel):
    codigo_cliente: str
    nombre: Optional[str] = None
    cedula: Optional[str] = None
    fecha_instalacion: Optional[date] = None
    direccion: Optional[str] = None
    medidor: Optional[str] = None
    marca: Optional[str] = None
    serie: Optional[str] = None
    meses_deuda: Optional[int] = None
    deuda_sap: Optional[Decimal] = None
    deuda_sico: Optional[Decimal] = None

    class Config:
        from_attributes = True


class EstadoCuentaBase(BaseModel):
    id_factura: str
    fecha_emision: date
    valor: Decimal
    estado: str

    class Config:
        from_attributes = True


class EstadoSICOBase(BaseModel):
    fecha: date
    estado_sico: str
    observacion: Optional[str] = None

    class Config:
        from_attributes = True


class ConsumoBase(BaseModel):
    periodo: str
    kwh: Decimal

    class Config:
        from_attributes = True


class LecturaBase(BaseModel):
    fecha_lectura: date
    lectura_actual: int
    tipo: Optional[str] = None

    class Config:
        from_attributes = True


class ClienteCompletoResponse(BaseModel):
    datos_personales: ClienteBase
    estado_cuenta: List[EstadoCuentaBase]
    estado_sico: List[EstadoSICOBase]
    consumos: List[ConsumoBase]
    lecturas: List[LecturaBase]