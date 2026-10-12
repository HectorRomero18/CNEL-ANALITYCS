# CNEL-ANALITYCS
Sistema para consultas de datos historicos de CNEL EP

## Configuracion de seguridad

La aplicacion requiere `SECRET_KEY` en el archivo `.env` para firmar y validar
los tokens de acceso. Usa un valor aleatorio de al menos 32 caracteres; por
ejemplo, puedes generarlo con:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Guarda el resultado como `SECRET_KEY=...` en `.env` y no lo compartas ni lo
incluyas en el repositorio. Al cambiar la clave, los tokens existentes dejan
de ser validos y los usuarios tendran que iniciar sesion de nuevo.

## Catalogo de la base de datos externa

Desde `backend`, con las variables de conexion configuradas, ejecuta:

```bash
python inspect_external_schema.py --output external_schema.json
```

El archivo generado contiene las tablas y columnas disponibles, con tipo y
nullable, sin consultar ni guardar datos de clientes. Vuelve a ejecutar el
comando para actualizar el catalogo cuando cambie el esquema externo.

Para comprobar los campos usados por los modulos con un cliente, abre y ejecuta
`backend/verify_client_fields.sql` en SQL Server Management Studio. Cambia
`@codigo_cliente` por el codigo que quieras revisar.
