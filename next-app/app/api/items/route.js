import { NextResponse } from 'next/server';
import { all, run, get } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(req) {
    try {
        const rows = await all(`SELECT * FROM items ORDER BY date DESC`);
        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    const userPayload = authenticate(req);
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { title, category, price, condition, description, image } = body;
        const sellerEmail = userPayload.email;
        const date = Date.now();
        
        const user = await get(`SELECT name FROM users WHERE email = ?`, [sellerEmail]);
        if (!user) return NextResponse.json({ error: 'Seller not found' }, { status: 400 });
        
        const result = await run(`INSERT INTO items (title, category, price, condition, description, sellerEmail, sellerName, image, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, category, price, condition, description, sellerEmail, user.name, image, date]);
            
        return NextResponse.json({ id: result.lastID });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
