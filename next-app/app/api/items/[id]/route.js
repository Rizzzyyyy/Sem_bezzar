import { NextResponse } from 'next/server';
import { run, get } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function PUT(req, { params }) {
    const userPayload = authenticate(req);
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized (Token)' }, { status: 401 });

    try {
        const p = await params;
        const itemId = parseInt(p.id, 10);
        const sellerEmail = userPayload.email;
        const body = await req.json();
        const { title, category, price, condition, description, image } = body;
        
        const item = await get(`SELECT sellerEmail FROM items WHERE id = ?`, [itemId]);
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        if (item.sellerEmail !== sellerEmail) return NextResponse.json({ error: `Unauthorized (Seller mismatch: ${item.sellerEmail} vs ${sellerEmail})` }, { status: 403 });
        
        let query = `UPDATE items SET title = ?, category = ?, price = ?, condition = ?, description = ?`;
        let qParams = [title, category, price, condition, description];
        
        if (image) {
            query += `, image = ?`;
            qParams.push(image);
        }
        query += ` WHERE id = ?`;
        qParams.push(itemId);
        
        await run(query, qParams);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    const userPayload = authenticate(req);
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const p = await params;
        const itemId = parseInt(p.id, 10);
        const sellerEmail = userPayload.email;
        
        const item = await get(`SELECT sellerEmail FROM items WHERE id = ?`, [itemId]);
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        if (item.sellerEmail !== sellerEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        
        await run(`DELETE FROM items WHERE id = ?`, [itemId]);
        await run(`DELETE FROM requests WHERE itemId = ?`, [itemId]);
        
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
