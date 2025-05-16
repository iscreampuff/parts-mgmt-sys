const mysql = require('mysql2');

// Create a connection pool to the database
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: 'hakkai_k0nz3n',
//   database: 'PartsManagementSystem',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db4free.net',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'hakkai_sys',
  password: process.env.DB_PASSWORD || 'hakkai_k0nz3n',
  database: process.env.DB_NAME || 'parts_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error("❌ MySQL Connection Error:", err.message);
//   } else {
//     console.log("✅ Connected to db4free.net!");
//     connection.release();
//   }
// });

// Export the pool for use in other parts of the application
module.exports = pool;
