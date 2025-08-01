const express = require('express');
const router = express.Router();
const db = require('../db');

// Crear nueva factura
router.post('/', async (req, res) => {
    const { cliente_id, total, forma_pago, productos } = req.body;
    
    console.log('Datos recibidos:', req.body);
    
    if (!cliente_id || !productos || productos.length === 0) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    try {
        // Obtener conexión del pool
        const connection = await db.getConnection();
        
        try {
            // Iniciar transacción
            await connection.beginTransaction();

            // Insertar factura
            const [result] = await connection.query(
                'INSERT INTO facturas (cliente_id, total, forma_pago) VALUES (?, ?, ?)',
                [cliente_id, total, forma_pago]
            );

            const factura_id = result.insertId;

            // Insertar detalles de factura
            const detallesValues = productos.map(p => [
                factura_id,
                p.producto_id,
                p.cantidad,
                p.precio,
                p.unidad,
                p.subtotal
            ]);

            await connection.query(
                'INSERT INTO detalle_factura (factura_id, producto_id, cantidad, precio_unitario, unidad_medida, subtotal) VALUES ?',
                [detallesValues]
            );

            // Confirmar transacción
            await connection.commit();
            
            // Devolver la conexión al pool
            connection.release();
            
            res.status(201).json({ id: factura_id });

        } catch (error) {
            // Si hay error, hacer rollback
            await connection.rollback();
            // Devolver la conexión al pool
            connection.release();
            throw error; // Re-lanzar el error para que lo maneje el catch exterior
        }

    } catch (error) {
        console.error('Error al crear factura:', error);
        res.status(500).json({ error: 'Error al crear factura' });
    }
});

// Vista previa e impresión de factura
router.get('/:id/imprimir', async (req, res) => {
    const factura_id = req.params.id;

    try {
        // Obtener configuración
        const [configRows] = await db.query(
            'SELECT * FROM configuracion_impresion LIMIT 1'
        );

        if (!configRows || configRows.length === 0) {
            return res.status(400).json({ error: 'No se ha configurado la información de impresión' });
        }

        const config = configRows[0];

        // Convertir imágenes a formato data URL si existen
        if (config.logo_data) {
            const logoBuffer = Buffer.from(config.logo_data);
            config.logo_src = `data:image/${config.logo_tipo};base64,${logoBuffer.toString('base64')}`;
        }
        if (config.qr_data) {
            const qrBuffer = Buffer.from(config.qr_data);
            config.qr_src = `data:image/${config.qr_tipo};base64,${qrBuffer.toString('base64')}`;
        }

        // Obtener datos de la factura
        const [facturas] = await db.query(
            `SELECT f.*, c.nombre as cliente_nombre, c.direccion, c.telefono
             FROM facturas f
             JOIN clientes c ON f.cliente_id = c.id
             WHERE f.id = ?`,
            [factura_id]
        );

        if (!facturas || facturas.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        // Obtener detalles de la factura
        const [detalles] = await db.query(
            `SELECT d.*, p.nombre as producto_nombre
             FROM detalle_factura d
             JOIN productos p ON d.producto_id = p.id
             WHERE d.factura_id = ?`,
            [factura_id]
        );

        if (!detalles) {
            return res.status(404).json({ error: 'No se encontraron detalles de la factura' });
        }

        // Renderizar la vista de la factura
        res.render('factura', {
            factura: facturas[0],
            detalles: detalles,
            config: config
        });

    } catch (error) {
        console.error('Error al obtener datos de factura:', error);
        res.status(500).json({ error: 'Error al obtener datos de factura' });
    }
});

// Ruta para obtener detalles de una factura
router.get('/:id/detalles', async (req, res) => {
    try {
        // Obtener información de la factura
        const [facturas] = await db.query(
            'SELECT f.*, c.nombre as cliente_nombre, c.direccion, c.telefono FROM facturas f ' +
            'JOIN clientes c ON f.cliente_id = c.id ' +
            'WHERE f.id = ?',
            [req.params.id]
        );

        if (facturas.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const factura = facturas[0];

        // Obtener productos de la factura
        const [productos] = await db.query(
            'SELECT d.cantidad, d.precio_unitario, d.unidad_medida, d.subtotal, p.nombre ' +
            'FROM detalle_factura d ' +
            'JOIN productos p ON d.producto_id = p.id ' +
            'WHERE d.factura_id = ?',
            [req.params.id]
        );

        // Estructurar la respuesta asegurando que los valores numéricos sean válidos
        res.json({
            factura: {
                id: factura.id,
                fecha: factura.fecha,
                total: parseFloat(factura.total || 0),
                forma_pago: factura.forma_pago
            },
            cliente: {
                nombre: factura.cliente_nombre || '',
                direccion: factura.direccion || '',
                telefono: factura.telefono || ''
            },
            productos: productos.map(p => ({
                nombre: p.nombre || '',
                cantidad: parseFloat(p.cantidad || 0),
                unidad: p.unidad_medida || '',
                precio: parseFloat(p.precio_unitario || 0),
                subtotal: parseFloat(p.subtotal || 0)
            }))
        });
    } catch (error) {
        console.error('Error al obtener detalles de la factura:', error);
        res.status(500).json({ error: 'Error al obtener detalles de la factura' });
    }
});

module.exports = router; 