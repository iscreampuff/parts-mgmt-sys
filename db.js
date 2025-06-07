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
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 5
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
