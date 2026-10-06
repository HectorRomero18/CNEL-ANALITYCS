from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CreditoDebitoBase(BaseModel):
    fecha: Optional[datetime] = None
    numero_nota: Optional[int] = None
    kwh: Optional[int] = None
    valor: Optional[Decimal] = None
    tipo_cargo: Optional[str] = None
    codigo_nota: Optional[int] = None
    orden: Optional[int] = None


class ConvenioBase(BaseModel):
    fecha: Optional[datetime] = None
    deuda: Optional[Decimal] = None
    numero_partes: Optional[str] = None
    saldo_pendiente: Optional[Decimal] = None
    estado: Optional[str] = None
    observacion: Optional[str] = None


class ClienteBase(BaseModel):
    codigo_cliente: str | int
    nombre: Optional[str] = None
    cedula: Optional[str] = None
    fecha_instalacion: Optional[datetime] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    medidor: Optional[str] = None
    marca: Optional[str] = None
    serie: Optional[str] = None
    modelo_medidor: Optional[str] = None
    consumo_promedio: Optional[Decimal] = None
    nota_debito_credito: Optional[int] = None
    deuda_convenio: Optional[Decimal] = None
    num_partes_convenio: Optional[str] = None
    fecha_convenio: Optional[datetime] = None
    obs_convenio: Optional[str] = None
    meses_deuda: Optional[int] = None
    deuda_sap: Optional[Decimal] = None
    deuda_sico: Optional[Decimal] = None

    class Config:
        from_attributes = True


class EstadoCuentaBase(BaseModel):
    fecha: Optional[datetime] = None
    tipo_evento: Optional[str] = None
    codigo_evento: Optional[str] = None
    factura: Optional[int] = None
    valor: Optional[Decimal] = None
    saldo: Optional[Decimal] = None

    class Config:
        from_attributes = True


class EstadoSICOBase(BaseModel):
    fecha: Optional[datetime] = None
    estado_sico: Optional[str] = None
    codigo_evento: Optional[str] = None
    factura: Optional[int] = None
    valor: Optional[Decimal] = None
    saldo: Optional[Decimal] = None

    class Config:
        from_attributes = True


class ConsumoBase(BaseModel):
    periodo: Optional[str] = None
    kwh: Optional[Decimal | int] = None
    kwh_reactiva: Optional[int] = None
    dias_facturados: Optional[int] = None

    class Config:
        from_attributes = True


class LecturaBase(BaseModel):
    cx_cliente: Optional[str | int] = None
    cx_nummed: Optional[str] = None
    fx_tomalec: Optional[datetime] = None
    qx_ultlec: Optional[Decimal] = None
    qx_tomalec: Optional[Decimal] = None
    qx_factlec: Optional[Decimal] = None
    consumo_kwh: Optional[Decimal] = None
    tipo_lectura_desc: Optional[str] = None
    cx_observa: Optional[str] = None
    observacion_desc: Optional[str] = None
    cx_tipo: Optional[str] = None
    tp_lectura: Optional[str] = None

    class Config:
        from_attributes = True


class ClienteCompletoResponse(BaseModel):
    datos_personales: ClienteBase
    creditos_debitos: List[CreditoDebitoBase]
    convenios: List[ConvenioBase]
    estado_cuenta: List[EstadoCuentaBase]
    estado_sico: List[EstadoSICOBase]
    consumos: List[ConsumoBase]
    lecturas: List[LecturaBase]