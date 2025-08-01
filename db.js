const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '111',
    database: 'reconocimiento',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
}).promise();

// Verificar la conexión
pool.getConnection()
    .then(connection => {
        console.log('Conexión exitosa a la base de datos');
        connection.release();
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err);
    });

module.exports = pool; 