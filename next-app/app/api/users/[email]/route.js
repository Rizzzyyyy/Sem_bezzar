import { NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(req, { params }) {
    const userPayload = authenticate(req);
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { email } = await params;
        const user = await get(`SELECT email, name, usn, branch, phone, address, logo FROM users WHERE email = ?`, [email]);
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        return NextResponse.json(user);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
