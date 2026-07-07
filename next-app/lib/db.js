import { Pool } from 'pg';

let pool;

// Prevents serverless workers from continuously spawning redundant pools
if (!global._postgresPool) {
    if (process.env.DATABASE_URL) {
        global._postgresPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 4, // Keeps connection limits small and optimized for serverless instances
            idleTimeoutMillis: 15000,
            connectionTimeoutMillis: 5000,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
}

pool = global._postgresPool;

if (pool) {
    pool.on('error', (err) => {
        console.error('Unexpected error on idle pg client', err);
    });

    // Initialize tables
    const initDb = async () => {
        try {
            await pool.query(`CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                name TEXT,
                usn TEXT,
                branch TEXT,
                phone TEXT,
                address TEXT,
                logo TEXT,
                password TEXT
            )`);

            await pool.query(`CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                title TEXT,
                category TEXT,
                price INTEGER,
                condition TEXT,
                description TEXT,
                sellerEmail TEXT,
                sellerName TEXT,
                image TEXT,
                date BIGINT,
                FOREIGN KEY(sellerEmail) REFERENCES users(email) ON DELETE CASCADE
            )`);

            await pool.query(`CREATE TABLE IF NOT EXISTS requests (
                requestId SERIAL PRIMARY KEY,
                itemId INTEGER,
                itemTitle TEXT,
                buyerName TEXT,
                buyerUsn TEXT,
                buyerBranch TEXT,
                buyerEmail TEXT,
                status TEXT,
                FOREIGN KEY(itemId) REFERENCES items(id) ON DELETE CASCADE,
                FOREIGN KEY(buyerEmail) REFERENCES users(email) ON DELETE CASCADE
            )`);
            console.log('PostgreSQL Database tables verified/created successfully.');
        } catch (e) {
            console.error('Error initializing Postgres tables:', e);
        }
    };

    initDb();
} else {
    console.warn('WARNING: No DATABASE_URL found in environment variables. Database connections will fail.');
}

// Initialize tables
const initDb = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                name TEXT,
                usn TEXT,
                branch TEXT,
                phone TEXT,
                address TEXT,
                logo TEXT,
                password TEXT
            )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                title TEXT,
                category TEXT,
                price INTEGER,
                condition TEXT,
                description TEXT,
                sellerEmail TEXT,
                sellerName TEXT,
                image TEXT,
                date BIGINT,
                FOREIGN KEY(sellerEmail) REFERENCES users(email) ON DELETE CASCADE
            )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS requests (
                requestId SERIAL PRIMARY KEY,
                itemId INTEGER,
                itemTitle TEXT,
                buyerName TEXT,
                buyerUsn TEXT,
                buyerBranch TEXT,
                buyerEmail TEXT,
                status TEXT,
                FOREIGN KEY(itemId) REFERENCES items(id) ON DELETE CASCADE,
                FOREIGN KEY(buyerEmail) REFERENCES users(email) ON DELETE CASCADE
            )`);
        console.log('PostgreSQL Database tables verified/created successfully.');
    } catch (e) {
        console.error('Error initializing Postgres tables:', e);
    }
};

initDb();
} else {
    console.warn('WARNING: No DATABASE_URL found in environment variables. Database connections will fail.');
}

// Convert SQLite '?' placeholders to Postgres '$1, $2, ...'
const convertQuery = (query) => {
    let index = 1;
    return query.replace(/\?/g, () => `$${index++}`);
};

export const get = async (query, params = []) => {
    if (!pool) throw new Error("Database not connected. Please set DATABASE_URL.");
    const pgQuery = convertQuery(query);
    const { rows } = await pool.query(pgQuery, params);
    return rows[0];
};

export const all = async (query, params = []) => {
    if (!pool) throw new Error("Database not connected. Please set DATABASE_URL.");
    const pgQuery = convertQuery(query);
    const { rows } = await pool.query(pgQuery, params);
    return rows;
};

export const run = async (query, params = []) => {
    if (!pool) throw new Error("Database not connected. Please set DATABASE_URL.");
    const pgQuery = convertQuery(query);

    // Convert SQLite INSERT ... lastID to Postgres returning logic
    let isInsert = pgQuery.trim().toUpperCase().startsWith('INSERT');
    let finalQuery = pgQuery;

    if (isInsert && !pgQuery.toUpperCase().includes('RETURNING')) {
        // Find table name to determine primary key for RETURNING clause
        const tableMatch = pgQuery.match(/INSERT\s+INTO\s+(\w+)/i);
        if (tableMatch) {
            const table = tableMatch[1].toLowerCase();
            if (table === 'users') {
                finalQuery += ' RETURNING email as lastID';
            } else if (table === 'requests') {
                finalQuery += ' RETURNING requestId as lastID';
            } else {
                finalQuery += ' RETURNING id as lastID';
            }
        }
    }

    const { rowCount, rows } = await pool.query(finalQuery, params);
    return {
        changes: rowCount,
        lastID: rows && rows.length > 0 ? rows[0].lastid || rows[0].lastID : null
    };
};
