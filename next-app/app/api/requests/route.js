import { NextResponse } from 'next/server';
import { all, run, get } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(req) {
    const userPayload = authenticate(req);
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const rows = await all(`
            SELECT r.*, i.sellerEmail FROM requests r 
            JOIN items i ON r.itemId = i.id 
            WHERE r.buyerEmail = ? OR i.sellerEmail = ?
        `, [userPayload.email, userPayload.email]);
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
        const { itemId, itemTitle } = body;
        const buyerEmail = userPayload.email;
        
        const user = await get(`SELECT name, usn, branch FROM users WHERE email = ?`, [buyerEmail]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });
        
        const result = await run(`INSERT INTO requests (itemId, itemTitle, buyerName, buyerUsn, buyerBranch, buyerEmail, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [itemId, itemTitle, user.name, user.usn, user.branch, buyerEmail]);
            
        return NextResponse.json({ requestId: result.lastID });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
