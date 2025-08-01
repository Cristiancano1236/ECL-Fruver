$(document).ready(function() {
    let timeoutCliente;
    let timeoutProducto;
    let productoSeleccionado = null;
    let pedidosGuardados = JSON.parse(localStorage.getItem('pedidos') || '[]');
    let pedidoActualId = null; // Para rastrear el ID del pedido cargado

    // Función para actualizar localStorage
    function actualizarLocalStorage() {
        localStorage.setItem('pedidos', JSON.stringify(pedidosGuardados));
    }

    // Búsqueda de clientes
    $('#cliente').on('keyup', function() {
        clearTimeout(timeoutCliente);
        const valor = $(this).val();
        
        if (valor.length < 2) return;

        timeoutCliente = setTimeout(() => {
            $.ajax({
                url: '/api/clientes/buscar',
                data: { q: valor },
                success: function(clientes) {
                    if (clientes.length === 0) {
                        $('#infoCliente').hide();
                        return;
                    }
                    
                    // Si solo hay un cliente, seleccionarlo automáticamente
                    if (clientes.length === 1) {
                        seleccionarCliente(clientes[0]);
                    } else {
                        // Aquí podrías mostrar una lista de clientes para seleccionar
                        mostrarListaClientes(clientes);
                    }
                }
            });
        }, 300);
    });

    // Búsqueda de productos
    $('#producto').on('keyup', function() {
        clearTimeout(timeoutProducto);
        const valor = $(this).val();
        
        if (valor.length < 2) return;

        timeoutProducto = setTimeout(() => {
            $.ajax({
                url: '/api/productos/buscar',
                data: { q: valor },
                success: function(productos) {
                    if (productos.length === 1) {
                        seleccionarProducto(productos[0]);
                    } else if (productos.length > 1) {
                        mostrarListaProductos(productos);
                    }
                }
            });
        }, 300);
    });

    // Función para seleccionar cliente
    function seleccionarCliente(cliente) {
        if (!cliente || !cliente.id) {
            console.error('Cliente inválido:', cliente);
            return;
        }

        // Actualizar campos visibles
        $('#cliente').val(cliente.nombre);
        $('#cliente_id').val(cliente.id);
        
        // Actualizar información del cliente
        $('#direccionCliente').text(cliente.direccion || 'No especificada');
        $('#telefonoCliente').text(cliente.telefono || 'No especificado');
        
        // Mostrar el panel de información
        $('#infoCliente').show();
    }

    // Función para seleccionar producto
    function seleccionarProducto(producto) {
        productoSeleccionado = producto;
        $('#producto').val(producto.nombre);
        $('#producto_id').val(producto.id);
        actualizarPrecioSegunUnidad(producto, $('#unidadMedida').val());
        $('#cantidad').focus();
    }

    // Función para mostrar lista de clientes
    function mostrarListaClientes(clientes) {
        const lista = $('<div class="list-group search-results">');
        clientes.forEach(cliente => {
            lista.append(
                $('<a href="#" class="list-group-item list-group-item-action">')
                    .text(`${cliente.nombre} ${cliente.telefono ? '- ' + cliente.telefono : ''}`)
                    .click(function(e) {
                        e.preventDefault();
                        seleccionarCliente(cliente);
                        lista.remove();
                    })
            );
        });
        $('#cliente').closest('.search-container').append(lista);
    }

    // Función para mostrar lista de productos
    function mostrarListaProductos(productos) {
        const lista = $('<div class="list-group search-results">');
        productos.forEach(producto => {
            lista.append(
                $('<a href="#" class="list-group-item list-group-item-action">')
                    .html(`
                        <div><strong>${producto.codigo}</strong> - ${producto.nombre}</div>
                        <div class="small text-muted">
                            KG: $${producto.precio_kg} | UND: $${producto.precio_unidad} | LB: $${producto.precio_libra}
                        </div>
                    `)
                    .click(function(e) {
                        e.preventDefault();
                        seleccionarProducto(producto);
                        lista.remove();
                    })
            );
        });
        $('#producto').closest('.search-container').append(lista);
    }

    // Cerrar listas al hacer clic fuera
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.input-group').length) {
            $('.list-group').remove();
        }
    });

    // Manejar cambio de unidad de medida
    $('#unidadMedida').on('change', function() {
        if (productoSeleccionado) {
            actualizarPrecioSegunUnidad(productoSeleccionado, $(this).val());
        }
    });

    // Función para actualizar precio según unidad de medida
    function actualizarPrecioSegunUnidad(producto, unidad) {
        let precio = 0;
        switch(unidad) {
            case 'KG':
                precio = producto.precio_kg;
                break;
            case 'UND':
                precio = producto.precio_unidad;
                break;
            case 'LB':
                precio = producto.precio_libra;
                break;
        }
        $('#precio').val(precio);
    }

    // Variables para la factura
    let productosFactura = [];
    let totalFactura = 0;

    // Agregar producto a la factura
    $('#agregarProducto').click(function() {
        if (!productoSeleccionado) {
            mostrarAlerta('warning', 'Por favor seleccione un producto');
            return;
        }

        const cantidad = parseFloat($('#cantidad').val());
        const unidad = $('#unidadMedida').val();
        const precio = parseFloat($('#precio').val());

        if (!cantidad || !precio) {
            mostrarAlerta('warning', 'Por favor complete todos los campos');
            return;
        }

        const subtotal = cantidad * precio;
        const item = {
            producto_id: productoSeleccionado.id,
            nombre: productoSeleccionado.nombre,
            cantidad,
            unidad,
            precio,
            subtotal
        };

        productosFactura.push(item);
        actualizarTablaProductos();
        limpiarFormularioProducto();
    });

    // Función para actualizar la tabla de productos
    function actualizarTablaProductos() {
        const tbody = $('#productosTabla');
        tbody.empty();
        totalFactura = 0;

        productosFactura.forEach((item, index) => {
            totalFactura += item.subtotal;
            tbody.append(`
                <tr>
                    <td>${item.nombre}</td>
                    <td>${item.cantidad}</td>
                    <td>${item.unidad}</td>
                    <td class="text-end">$${item.precio.toLocaleString('es-CO')}</td>
                    <td class="text-end">$${item.subtotal.toLocaleString('es-CO')}</td>
                    <td class="text-center">
                        <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });

        $('#totalFactura').text(totalFactura.toLocaleString('es-CO'));
    }

    // Función para eliminar producto
    window.eliminarProducto = function(index) {
        productosFactura.splice(index, 1);
        actualizarTablaProductos();
    };

    // Función para limpiar el formulario de producto
    function limpiarFormularioProducto() {
        $('#producto').val('');
        $('#producto_id').val('');
        $('#cantidad').val('');
        $('#precio').val('');
        $('#unidadMedida').val('UND');
        productoSeleccionado = null;
    }

    // Función para limpiar el formulario completo
    function limpiarFormulario(mantenerPedidoId = false) {
        productosFactura = [];
        totalFactura = 0;
        actualizarTablaProductos();
        $('#cliente').val('');
        $('#cliente_id').val('');
        $('#infoCliente').hide();
        $('#formaPago').val('efectivo');
        limpiarFormularioProducto();
        
        // Solo limpiar el ID si no se indica mantenerlo
        if (!mantenerPedidoId) {
            localStorage.removeItem('pedidoActualId');
        }
    }

    // Guardar pedido
    $('#guardarPedido').click(function() {
        console.log('=== INICIO GUARDADO DE PEDIDO ===');
        const cliente_id = $('#cliente_id').val();
        const cliente_nombre = $('#cliente').val();
        
        if (!cliente_id) {
            console.log('Error: No hay cliente seleccionado');
            mostrarAlerta('warning', 'Por favor seleccione un cliente');
            return;
        }

        if (productosFactura.length === 0) {
            console.log('Error: No hay productos en el pedido');
            mostrarAlerta('warning', 'Agregue al menos un producto al pedido');
            return;
        }

        const pedido = {
            id: Date.now(),
            cliente_id: cliente_id,
            cliente_nombre: cliente_nombre,
            direccion: $('#direccionCliente').text(),
            telefono: $('#telefonoCliente').text(),
            productos: JSON.parse(JSON.stringify(productosFactura)),
            total: totalFactura,
            forma_pago: $('#formaPago').val(),
            fecha: new Date().toLocaleString()
        };

        console.log('Pedido a guardar:', pedido);
        console.log('Pedidos guardados antes:', pedidosGuardados);
        
        pedidosGuardados.push(pedido);
        actualizarLocalStorage();
        
        console.log('Pedidos guardados después:', pedidosGuardados);
        console.log('LocalStorage actualizado');

        limpiarFormulario();
        mostrarAlerta('success', 'Pedido guardado exitosamente');
        console.log('=== FIN GUARDADO DE PEDIDO ===');
    });

    // Función para cargar un pedido guardado
    window.cargarPedido = function(index) {
        console.log('=== INICIO CARGA DE PEDIDO ===');
        console.log('Índice del pedido a cargar:', index);
        
        const pedido = pedidosGuardados[index];
        console.log('Pedido encontrado:', pedido);
        
        if (!pedido) {
            console.error('No se encontró el pedido');
            return;
        }
        
        // Primero limpiar todo (sin eliminar el ID)
        productosFactura = [];
        totalFactura = 0;
        actualizarTablaProductos();
        $('#cliente').val('');
        $('#cliente_id').val('');
        $('#infoCliente').hide();
        $('#formaPago').val('efectivo');
        limpiarFormularioProducto();
        
        // Guardar el ID del pedido cargado
        localStorage.setItem('pedidoActualId', pedido.id);
        console.log('ID del pedido guardado en localStorage:', pedido.id);
        console.log('Verificación del ID guardado:', localStorage.getItem('pedidoActualId'));
        
        // Cargar información del cliente
        $('#cliente').val(pedido.cliente_nombre);
        $('#cliente_id').val(pedido.cliente_id);
        $('#direccionCliente').text(pedido.direccion || 'No especificada');
        $('#telefonoCliente').text(pedido.telefono || 'No especificado');
        $('#infoCliente').show();
        
        // Cargar productos
        productosFactura = pedido.productos;
        totalFactura = pedido.total;
        
        // Cargar forma de pago
        $('#formaPago').val(pedido.forma_pago || 'efectivo');
        
        // Actualizar la tabla de productos
        actualizarTablaProductos();
        
        // Cerrar el modal de pedidos
        $('#pedidosModal').modal('hide');
        
        console.log('=== FIN CARGA DE PEDIDO ===');
        console.log('Estado final:', {
            pedidoId: pedido.id,
            cliente: pedido.cliente_nombre,
            productos: productosFactura,
            total: totalFactura
        });
    };

    // Generar factura
    $('#generarFactura').click(function() {
        console.log('=== INICIO GENERACIÓN DE FACTURA ===');
        const cliente_id = $('#cliente_id').val();
        const forma_pago = $('#formaPago').val();
        
        if (!cliente_id) {
            mostrarAlerta('warning', 'Por favor seleccione un cliente');
            return;
        }

        if (productosFactura.length === 0) {
            mostrarAlerta('warning', 'Agregue al menos un producto a la factura');
            return;
        }

        const factura = {
            cliente_id: cliente_id,
            total: totalFactura,
            forma_pago: forma_pago,
            productos: productosFactura.map(p => ({
                producto_id: p.producto_id,
                cantidad: p.cantidad,
                precio: p.precio,
                unidad: p.unidad,
                subtotal: p.subtotal
            }))
        };

        console.log('Factura a enviar:', factura);

        // Mostrar indicador de carga
        Swal.fire({
            title: 'Generando factura...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/api/facturas',
            method: 'POST',
            data: JSON.stringify(factura),
            contentType: 'application/json',
            success: function(response) {
                Swal.close();
                console.log('Factura generada exitosamente:', response);
                
                if (response && response.id) {
                    // Eliminar el pedido de localStorage si existe
                    const pedidoId = localStorage.getItem('pedidoActualId');
                    if (pedidoId) {
                        pedidosGuardados = pedidosGuardados.filter(p => p.id != pedidoId);
                        actualizarLocalStorage();
                        localStorage.removeItem('pedidoActualId');
                    }

                    // Mostrar la factura
                    const facturaModal = new bootstrap.Modal(document.getElementById('facturaModal'));
                    const iframeUrl = `/api/facturas/${response.id}/imprimir`;
                    console.log('URL del iframe:', iframeUrl);
                    $('#facturaFrame').attr('src', iframeUrl);
                    facturaModal.show();

                    // Limpiar el formulario
                    limpiarFormulario();
                    mostrarAlerta('success', 'Factura generada exitosamente');
                } else {
                    mostrarAlerta('error', 'Error: No se recibió el ID de la factura');
                }
            },
            error: function(xhr, status, error) {
                Swal.close();
                console.error('Error al generar factura:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText,
                    error: error
                });

                let mensajeError = 'Error al generar la factura';
                if (xhr.status === 0) {
                    mensajeError = 'No se pudo conectar con el servidor. Por favor, verifica tu conexión.';
                } else {
                    try {
                        const respuesta = JSON.parse(xhr.responseText);
                        mensajeError = respuesta.error || mensajeError;
                    } catch (e) {
                        console.error('Error al parsear respuesta:', e);
                        if (xhr.responseText) {
                            mensajeError = xhr.responseText;
                        }
                    }
                }
                
                mostrarAlerta('error', mensajeError);
            }
        });
    });

    // Ver pedidos guardados
    $('#verPedidos').click(function() {
        console.log('=== MOSTRANDO PEDIDOS GUARDADOS ===');
        const tbody = $('#pedidosGuardados');
        tbody.empty();

        console.log('Pedidos en memoria:', pedidosGuardados);

        if (pedidosGuardados.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="bi bi-inbox h3 d-block"></i>
                        No hay pedidos guardados
                    </td>
                </tr>
            `);
        } else {
        pedidosGuardados.forEach((pedido, index) => {
            const productosResumen = pedido.productos.map(p => p.nombre).join(', ');
            
            tbody.append(`
                <tr>
                    <td>
                        <strong>${pedido.cliente_nombre}</strong><br>
                        <small class="text-muted">
                            ${pedido.telefono}<br>
                                ${pedido.direccion}
                        </small>
                    </td>
                    <td><small>${productosResumen}</small></td>
                    <td>$${pedido.total.toLocaleString('es-CO')}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-primary" onclick="cargarPedido(${index})" title="Cargar pedido">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                            
                            <button class="btn btn-danger" onclick="eliminarPedido(${index})" title="Eliminar pedido">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
        }

        $('#pedidosModal').modal('show');
    });

    // Función para facturar pedido directamente
    window.facturarPedido = function(index) {
        console.log('=== INICIO FACTURACIÓN DIRECTA DE PEDIDO ===');
        console.log('Índice del pedido:', index);
        const pedido = pedidosGuardados[index];
        console.log('Pedido a facturar:', pedido);
        
        // Primero eliminar el pedido
        pedidosGuardados.splice(index, 1);
        actualizarLocalStorage();
        console.log('Pedido eliminado de la lista');
        
        // Cerrar el modal de pedidos
        $('#pedidosModal').modal('hide');
        
        // Cargar el pedido
        cargarPedido(pedido);
        
        // Generar la factura
        setTimeout(() => {
            $('#generarFactura').click();
        }, 500);
    };

    // Función para eliminar pedido
    window.eliminarPedido = function(index) {
        console.log('=== INICIO ELIMINACIÓN DE PEDIDO ===');
        console.log('Índice del pedido:', index);
            if (confirm('¿Está seguro de eliminar este pedido?')) {
            console.log('Pedidos antes de eliminar:', pedidosGuardados);
                pedidosGuardados.splice(index, 1);
                actualizarLocalStorage();
            console.log('Pedidos después de eliminar:', pedidosGuardados);
                $('#verPedidos').click();
            mostrarAlerta('success', 'Pedido eliminado exitosamente');
            console.log('=== FIN ELIMINACIÓN DE PEDIDO ===');
        }
    };

    // Función para mostrar alertas
    function mostrarAlerta(tipo, mensaje) {
        Swal.fire({
            icon: tipo,
            title: mensaje,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
}); 