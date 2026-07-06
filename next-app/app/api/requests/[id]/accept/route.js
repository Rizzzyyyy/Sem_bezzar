import { NextResponse } from 'next/server';
import { run, get } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function PUT(req, { params }) {
    const userPayload = authenticate(req);
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const requestId = id;
        const sellerEmail = userPayload.email;
        
        const row = await get(`SELECT i.sellerEmail, r.itemId FROM requests r JOIN items i ON r.itemId = i.id WHERE r.requestId = ?`, [requestId]);
        if (!row) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        if (row.sellerEmail !== sellerEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        
        const existing = await get(`SELECT requestId FROM requests WHERE itemId = ? AND status = 'accepted'`, [row.itemId]);
        if (existing && existing.requestId != requestId) return NextResponse.json({ error: 'Item already sold' }, { status: 400 });
        
        await run(`UPDATE requests SET status = 'accepted' WHERE requestId = ?`, [requestId]);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
