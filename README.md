# Sistema de Facturación ECL FRUVER

## Requisitos Previos
1. Node.js (versión 14 o superior)
2. MySQL (versión 5.7 o superior)
3. Git (opcional)

## Pasos de Instalación

### 1. Base de Datos
1. Abrir MySQL Workbench o el cliente MySQL de tu preferencia
2. Ejecutar el script `database.sql` que se encuentra en la raíz del proyecto

### 2. Aplicación
1. Clonar o descargar este repositorio
2. Abrir una terminal en la carpeta del proyecto
3. Instalar las dependencias:
```bash
npm install
```
4. Crear el archivo de configuración:
   - Copiar el archivo `.env.example` y renombrarlo a `.env`
   - Editar el archivo `.env` con tus credenciales de base de datos:
```
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_DATABASE=sistema_facturacion
PORT=3000
```

### 3. Iniciar el Sistema
1. Ejecutar el siguiente comando:
```bash
npm start
```
2. Abrir el navegador y acceder a: `http://localhost:3000`

## Estructura de Carpetas
- `/public` - Archivos estáticos (CSS, JS, imágenes)
- `/routes` - Rutas de la aplicación
- `/views` - Plantillas EJS
- `/config` - Configuración de la base de datos
- `/uploads` - Carpeta donde se guardan las imágenes subidas

## Funcionalidades
- Gestión de productos
- Gestión de clientes
- Generación de facturas
- Configuración de impresión
- Soporte para logo y QR de pagos

## Soporte
Para soporte o preguntas, ingresa a https://ciscodedev.netlify.app/
