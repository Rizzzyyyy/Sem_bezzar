import { NextResponse } from 'next/server';
import { get } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'sem_bazaar_super_secret_key';

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, password } = body;

        const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
        if (!user) {
            return NextResponse.json({ error: 'User not found. Please register.' }, { status: 400 });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ email: user.email }, JWT_SECRET);
            delete user.password;
            return NextResponse.json({ token, user });
        } else {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
