const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'sem_bazaar_super_secret_key';

// Increase payload limit for base64 images
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
    const { email, name, usn, branch, phone, address, logo, password } = req.body;
    
    if (!email || !email.endsWith('@rvce.edu.in')) {
        return res.status(400).json({ error: 'Only @rvce.edu.in email addresses are allowed.' });
    }
    
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(`INSERT INTO users (email, name, usn, branch, phone, address, logo, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, name, usn, branch, phone, address, logo, hashedPassword],
            function(err) {
                if (err) {
                    return res.status(400).json({ error: 'User already exists or database error.' });
                }
                const token = jwt.sign({ email }, JWT_SECRET);
                res.json({ token, email, name, usn, branch, logo, phone, address });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'User not found. Please register.' });
        
        try {
            if (await bcrypt.compare(password, user.password)) {
                const token = jwt.sign({ email: user.email }, JWT_SECRET);
                // Don't send password hash back
                delete user.password;
                res.json({ token, user });
            } else {
                res.status(401).json({ error: 'Invalid password' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

app.get('/api/users/:email', authenticateToken, (req, res) => {
    db.get(`SELECT email, name, usn, branch, phone, address, logo FROM users WHERE email = ?`, [req.params.email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });
});

// --- ITEMS ROUTES ---

app.get('/api/items', (req, res) => {
    db.all(`SELECT * FROM items ORDER BY date DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/items', authenticateToken, (req, res) => {
    const { title, category, price, condition, description, image } = req.body;
    const sellerEmail = req.user.email;
    const date = Date.now();
    
    // Get seller name
    db.get(`SELECT name FROM users WHERE email = ?`, [sellerEmail], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Seller not found' });
        
        db.run(`INSERT INTO items (title, category, price, condition, description, sellerEmail, sellerName, image, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, category, price, condition, description, sellerEmail, user.name, image, date],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID });
            }
        );
    });
});

app.put('/api/items/:id', authenticateToken, (req, res) => {
    const { title, category, price, condition, description, image } = req.body;
    const sellerEmail = req.user.email;
    const itemId = req.params.id;
    
    db.get(`SELECT sellerEmail FROM items WHERE id = ?`, [itemId], (err, item) => {
        if (err || !item) return res.status(404).json({ error: 'Item not found' });
        if (item.sellerEmail !== sellerEmail) return res.status(403).json({ error: 'Unauthorized' });
        
        let query = `UPDATE items SET title = ?, category = ?, price = ?, condition = ?, description = ?`;
        let params = [title, category, price, condition, description];
        
        if (image) {
            query += `, image = ?`;
            params.push(image);
        }
        query += ` WHERE id = ?`;
        params.push(itemId);
        
        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.delete('/api/items/:id', authenticateToken, (req, res) => {
    const sellerEmail = req.user.email;
    const itemId = req.params.id;
    
    db.get(`SELECT sellerEmail FROM items WHERE id = ?`, [itemId], (err, item) => {
        if (err || !item) return res.status(404).json({ error: 'Item not found' });
        if (item.sellerEmail !== sellerEmail) return res.status(403).json({ error: 'Unauthorized' });
        
        db.run(`DELETE FROM items WHERE id = ?`, [itemId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Also delete associated requests
            db.run(`DELETE FROM requests WHERE itemId = ?`, [itemId]);
            res.json({ success: true });
        });
    });
});

// --- REQUESTS ROUTES ---

app.get('/api/requests', authenticateToken, (req, res) => {
    // Return requests made BY the user AND requests made FOR the user's items
    db.all(`
        SELECT r.*, i.sellerEmail FROM requests r 
        JOIN items i ON r.itemId = i.id 
        WHERE r.buyerEmail = ? OR i.sellerEmail = ?
    `, [req.user.email, req.user.email], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/requests', authenticateToken, (req, res) => {
    const { itemId, itemTitle } = req.body;
    const buyerEmail = req.user.email;
    
    db.get(`SELECT name, usn, branch FROM users WHERE email = ?`, [buyerEmail], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        
        db.run(`INSERT INTO requests (itemId, itemTitle, buyerName, buyerUsn, buyerBranch, buyerEmail, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [itemId, itemTitle, user.name, user.usn, user.branch, buyerEmail],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ requestId: this.lastID });
            }
        );
    });
});

app.put('/api/requests/:id/accept', authenticateToken, (req, res) => {
    const requestId = req.params.id;
    const sellerEmail = req.user.email;
    
    // Verify that this user owns the item
    db.get(`SELECT i.sellerEmail, r.itemId FROM requests r JOIN items i ON r.itemId = i.id WHERE r.requestId = ?`, [requestId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Request not found' });
        if (row.sellerEmail !== sellerEmail) return res.status(403).json({ error: 'Unauthorized' });
        
        // Check if already sold
        db.get(`SELECT requestId FROM requests WHERE itemId = ? AND status = 'accepted'`, [row.itemId], (err, existing) => {
            if (existing && existing.requestId != requestId) return res.status(400).json({ error: 'Item already sold' });
            
            db.run(`UPDATE requests SET status = 'accepted' WHERE requestId = ?`, [requestId], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
