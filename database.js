// Obsolete file - migrated to next-app/lib/db.js
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
// const sqlite3 = require('sqlite3').verbose();
const db = {}; // Mock db object
        db.run(`CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            name TEXT,
            usn TEXT,
            branch TEXT,
            phone TEXT,
            address TEXT,
            logo TEXT,
            password TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            category TEXT,
            price INTEGER,
            condition TEXT,
            description TEXT,
            sellerEmail TEXT,
            sellerName TEXT,
            image TEXT,
            date INTEGER,
            FOREIGN KEY(sellerEmail) REFERENCES users(email)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS requests (
            requestId INTEGER PRIMARY KEY AUTOINCREMENT,
            itemId INTEGER,
            itemTitle TEXT,
            buyerName TEXT,
            buyerUsn TEXT,
            buyerBranch TEXT,
            buyerEmail TEXT,
            status TEXT,
            FOREIGN KEY(itemId) REFERENCES items(id),
            FOREIGN KEY(buyerEmail) REFERENCES users(email)
        )`);
    }
});

module.exports = db;
