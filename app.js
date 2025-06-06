const express = require('express');
const bodyParser = require("body-parser");
const request = require("request");
const env = require('dotenv').config();

// console.log({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   database: process.env.DB_NAME
// });

const pool = require('./db'); // Import the MySQL connection pool
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

// MySQL Session Store Setup
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'db4free.net',
  user: process.env.DB_USER || 'hakkai_sys',
  password: process.env.DB_PASSWORD || 'hakkai_k0nz3n',
  database: process.env.DB_NAME || 'parts_system',
  clearExpired: true,          // Optional: auto-clean expired sessions
  checkExpirationInterval: 900000, // 15 mins (optional)
});

// Session Middleware
// app.use(session({
//   secret: 'secret_key', // has to be changed for a more secure key in production
//   resave: false,
//   saveUninitialized: false
// }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,         // Uses MySQL for session storage
  cookie: {
    secure: false,             // Set to `true` if using HTTPS
    maxAge: 86400000           // Optional: 24h session expiry
  }
}));

// Routes (AFTER session middleware)
app.get('/user-info', (req, res) => {
  if (req.session.user) {
    res.json({
      username: req.session.user.username,
      role: req.session.user.role
    });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get('/admin', function(req, res) {
  if (req.session.user && req.session.user.role === 'admin') {
    res.sendFile(__dirname + "/views/home-admin.html")
  } else {
    res.send('Access Denied');
  }
});

app.get('/purchasing-agent', function(req, res) {
  if (req.session.user && req.session.user.role === 'purchasing_agent') {
    res.sendFile(__dirname + "/views/home-pa.html")
  } else {
    res.send('Access Denied');
  }
});

app.get('/suppliers-agent', function(req, res) {
  if (req.session.user && req.session.user.role === 'suppliers_agent') {
    res.sendFile(__dirname + "/views/home-sa.html")
  } else {
    res.send('Access Denied');
  }
});

app.get('/employee', function(req, res) {
  if (req.session.user && req.session.user.role === 'employee') {
    res.sendFile(__dirname + "/views/home-emp.html")
  } else {
    res.send('Access Denied');
  }
});

// Serve login
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/login.html");
});

// Handle login
app.post('/', (req, res) => {
  const {
    username,
    password
  } = req.body;

  pool.query(
    'SELECT * FROM users WHERE Username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        console.log("User not found");
        return res.send('Invalid username or password.');
      }

      const user = results[0];
      console.log(`Entered password: "${password}"`);
      console.log(`Stored hashed password: "${user.Password}"`);

      const isMatch = await bcrypt.compare(password, user.Password);

      if (!isMatch) {
        console.log("Password does not match.");
        return res.send('Invalid username or password.');
      }

      req.session.user = {
        id: user.UserID,
        username: user.Username,
        role: user.Role // store the role to persist sessions
      };

      console.log(user.UserID + " " + user.Username + " " + user.Role);

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).send("Server error");
        }

        // Redirect after session is confirmed saved
        if (user.Role === 'admin') {
          res.redirect('/admin');
        } else if (user.Role === 'purchasing_agent') {
          res.redirect('/purchasing-agent');
        } else if (user.Role === 'suppliers_agent') {
          res.redirect('/suppliers-agent');
        } else if (user.Role === 'employee') {
          res.redirect('/employee');
        } else {
          res.send('How did you get in here?');
        }
      });
    }
  );
});

// Serve signup
app.get('/signup', (req, res) => {
  res.sendFile(__dirname + "/public/signup.html");
});

// Handle signup
app.post('/signup', async (req, res) => {
  const {
    username,
    password,
    role
  } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  pool.query(
    'INSERT INTO users (Username, Password, Role) VALUES (?, ?, ?)',
    [username, hashedPassword, role],
    (err, results) => {
      if (err) {
        console.error(err);
        res.sendFile(__dirname + "/views/status/error.html");
      } else {
        // if (results.serverStatus == 2) {
        //   console.log('Registration successful!');
        //   res.sendFile(__dirname + "/views/status/success.html");
        // } else {
        //   console.log(results);
        //   res.sendFile(__dirname + "/views/status/error.html");
        // }
        console.log('Registration successful!', results);
        res.sendFile(__dirname + "/views/status/success.html");
      }
    }
  );
});



// READ READ READ READ READ

// Route to fetch all warehouse data
app.get('/warehouse-data', (req, res) => {
  pool.query('SELECT * FROM warehouse', (err, results) => {
    if (err) {
      console.error('Error fetching warehouse data:', err);
      return res.status(500).send('Error fetching data');
    }
    res.json(results);
  });
});

// Route to search for specific warehouse data
app.get('/search-warehouse', (req, res) => {
  const query = req.query.query;

  pool.query(
    'SELECT * FROM warehouse WHERE WarehouseID = ? OR ManagerName = ?',
    [query, query],
    (err, results) => {
      if (err) {
        console.error('Error searching warehouse data:', err);
        return res.status(500).send('Error searching data');
      }
      res.json(results);
    }
  );
});


// Route to fetch all supplier data
app.get('/supplier-data', (req, res) => {
  pool.query(
    'SELECT SupplierID, SupplierName, ContactInfo, Address FROM suppliers',
    (err, results) => {
      if (err) {
        console.error('Error fetching supplier data:', err);
        return res.status(500).send('Server error.');
      }
      res.json(results);
    }
  );
});

// Route to search for a supplier by SupplierID
app.get('/search-supplier', (req, res) => {
  const query = req.query.query;

  pool.query(
    'SELECT SupplierID, SupplierName, ContactInfo, Address FROM suppliers WHERE SupplierID = ?',
    [query],
    (err, results) => {
      if (err) {
        console.error('Error searching supplier data:', err);
        return res.status(500).send('Server error.');
      }
      res.json(results);
    }
  );
});


// Route to fetch all partsprocurement data
app.get('/parts-data', (req, res) => {
  pool.query('SELECT PartID, Quantity, SupplierID, ProcurementDate, Purchaser FROM partsprocurement', (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({
        error: 'Failed to fetch data'
      });
    }
    res.json(results);
  });
});

// Route to search for specific partsprocurement data
app.get('/search-part', (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({
      error: 'Query parameter is required'
    });
  }

  pool.query(
    'SELECT PartID, Quantity, SupplierID, ProcurementDate, Purchaser FROM partsprocurement WHERE PartID = ?',
    [query],
    (err, results) => {
      if (err) {
        console.error('Error searching data:', err);
        return res.status(500).json({
          error: 'Failed to search data'
        });
      }
      res.json(results);
    }
  );
});




// CUD CUD CUD CUD CUD

app.post('/create-warehouse', (req, res) => {
  const { warehouseId, usedStock, totalStock, managerName, phoneNumber } = req.body;

  // Validate input lengths
  if (warehouseId.length !== 3) {
    return res.status(400).json({
      error: 'WarehouseID must be 3 characters long.'
    });
  }

  const query = 'INSERT INTO warehouse (WarehouseID, UsedStock, TotalStock, ManagerName, PhoneNumber) VALUES (?, ?, ?, ?, ?)';
  pool.query(query, [warehouseId, usedStock, totalStock, managerName, phoneNumber], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      // Check for duplicate WarehouseID
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          error: 'WarehouseID already exists.'
        });
      }
      return res.status(500).json({
        error: 'Failed to create warehouse.'
      });
    }
    res.json({
      success: true,
      message: 'Warehouse created successfully.'
    });
  });
});

app.put('/update-warehouse', (req, res) => {
  console.log('Request Body:', req.body);
  const { originalWarehouseId, warehouseId, usedStock, totalStock, managerName, phoneNumber } = req.body;

  const query = `
    UPDATE warehouse
    SET WarehouseID = ?, UsedStock = ?, TotalStock = ?, ManagerName = ?, PhoneNumber = ?
    WHERE WarehouseID = ?
  `;

  pool.query(query, [warehouseId, usedStock, totalStock, managerName, phoneNumber, originalWarehouseId], (err, result) => {
    if (err) {
      console.error('Error updating warehouse:', err);
      return res.status(500).json({
        error: 'Failed to update warehouse.'
      });
    }
    res.json({
      message: 'Warehouse updated successfully.'
    });
  });
});

app.delete('/delete-warehouse', (req, res) => {
  const { ids } = req.body;

  const query = 'DELETE FROM warehouse WHERE WarehouseID IN (?)';
  pool.query(query, [ids], (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).json({
        error: 'Failed to delete warehouses.'
      });
    }
    res.json({
      success: true,
      message: 'Warehouses deleted successfully.'
    });
  });
});








app.post('/create-supplier', (req, res) => {
  const { supplierId, supplierName, contactInfo, address } = req.body;

  // Validate input lengths
  if (supplierId.length !== 3) {
    return res.status(400).json({
      error: 'SupplierID must be 3 characters long.'
    });
  }

  const query = 'INSERT INTO suppliers (SupplierID, SupplierName, ContactInfo, Address) VALUES (?, ?, ?, ?)';
  pool.query(query, [supplierId, supplierName, contactInfo, address], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      // Check for duplicate SupplierID
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          error: 'SupplierID already exists.'
        });
      }
      return res.status(500).json({
        error: 'Failed to create supplier.'
      });
    }
    res.json({
      success: true,
      message: 'Supplier created successfully.'
    });
  });
});

app.put('/update-supplier', (req, res) => {
  const { originalSupplierId, supplierId, supplierName, contactInfo, address } = req.body;

  const query = `
    UPDATE suppliers
    SET SupplierID = ?, SupplierName = ?, ContactInfo = ?, Address = ?
    WHERE SupplierID = ?
  `;

  pool.query(query, [supplierId, supplierName, contactInfo, address, originalSupplierId], (err, result) => {
    if (err) {
      console.error('Error updating supplier:', err);
      return res.status(500).json({
        error: 'Failed to update supplier.'
      });
    }
    res.json({
      message: 'Supplier updated successfully.'
    });
  });
});

app.delete('/delete-supplier', (req, res) => {
  const { ids } = req.body;

  const query = 'DELETE FROM suppliers WHERE SupplierID IN (?)';
  pool.query(query, [ids], (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).json({
        error: 'Failed to delete suppliers.'
      });
    }
    res.json({
      success: true,
      message: 'Suppliers deleted successfully.'
    });
  });
});








app.post('/create-part', (req, res) => {
  const {
    partId,
    quantity,
    supplierId,
    procurementDate,
    purchaser
  } = req.body;

  // Validate input lengths
  if (partId.length !== 7 || supplierId.length !== 3) {
    return res.status(400).json({
      error: 'PartID must be 7 chars and SupplierID must be 3 chars.'
    });
  }

  const query = 'INSERT INTO partsprocurement (PartID, Quantity, SupplierID, ProcurementDate, Purchaser) VALUES (?, ?, ?, ?, ?)';
  pool.query(query, [partId, quantity, supplierId, procurementDate, purchaser], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      // Check for duplicate PartID
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          error: 'PartID already exists.'
        });
      }
      return res.status(500).json({
        error: 'Failed to create part.'
      });
    }
    res.json({
      success: true,
      message: 'Part created successfully.'
    });
  });
});

// Route: Update a part
app.put('/update-part', (req, res) => {
  const {
    originalPartId,
    partId,
    quantity,
    supplierId,
    procurementDate,
    purchaser
  } = req.body;

  const query = `
    UPDATE partsprocurement
    SET PartID = ?, Quantity = ?, SupplierID = ?, ProcurementDate = ?, Purchaser = ?
    WHERE PartID = ?
  `;

  pool.query(query, [partId, quantity, supplierId, procurementDate, purchaser, originalPartId], (err, result) => {
    if (err) {
      console.error('Error updating part:', err);
      return res.status(500).json({
        error: 'Failed to update part.'
      });
    } else {
      console.log(partId);
      console.log(originalPartId);
    }
    res.json({
      message: 'Part updated successfully.'
    });
  });
});


// Route: Delete parts
app.delete('/delete-parts', (req, res) => {
  const {
    ids
  } = req.body;

  const query = 'DELETE FROM partsprocurement WHERE PartID IN (?)';
  pool.query(query, [ids], (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).json({
        error: 'Failed to delete parts'
      });
    }
    res.json({
      success: true,
      message: 'Parts deleted successfully'
    });
  });
});



// USE POSTMAN POSTMAN POSTMAN

// // Example route to get data from the `Warehouse` table (GET)
// app.get('/', (req, res) => {
//   pool.query('SELECT * FROM Warehouse', (err, results) => {
//     if (err) {
//       console.error('Error fetching warehouse data: ', err);
//       return res.status(500).send('Server Error');
//     }
//     res.json(results); // Send the data as a JSON response
//   });
// });

// // Example route to insert data into the `Warehouse` table (POST)
// app.post('/', (req, res) => {
//   const {
//     WarehouseID,
//     UsedStock,
//     TotalStock,
//     ManagerName,
//     PhoneNumber
//   } = req.body;
//
//   pool.query(
//     'INSERT INTO Warehouse (WarehouseID, UsedStock, TotalStock, ManagerName, PhoneNumber) VALUES (?, ?, ?, ?, ?)',
//     [WarehouseID, UsedStock, TotalStock, ManagerName, PhoneNumber],
//     (err, results) => {
//       if (err) {
//         console.error('Error inserting into warehouse: ', err);
//         return res.status(500).send('Server Error');
//       }
//       res.status(201).json({
//         id: results.insertId,
//         WarehouseID
//       });
//     }
//   );
// });



app.post("/success", function(req, res) {
  res.redirect("/");
});

app.post("/error", function(req, res) {
  res.redirect("/");
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error during logout.');
        }
        res.redirect('/'); // Redirect to login after logout
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
