// migrate-passwords.js
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Create MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'PartsManagementSystem'
});

(async () => {
    try {
        // Fetch all users from the database
        const [users] = await db.promise().query('SELECT UserID, password FROM Users');

        for (const user of users) {
            // Skip users whose passwords are already hashed
            if (user.password.startsWith('$2b$')) continue;

            // Hash the plaintext password
            const hashedPassword = await bcrypt.hash(user.password, 10);

            // Update the database with the hashed password
            await db.promise().query('UPDATE Users SET password = ? WHERE UserID = ?',
                                     [hashedPassword, user.UserID]);

            console.log(`Updated password for user ID: ${user.UserID}`);
        }

        console.log('All user passwords have been hashed.');
        db.end();  // Close the connection
    } catch (err) {
        console.error('Error updating passwords:', err);
    }
})();
