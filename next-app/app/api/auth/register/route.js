import { NextResponse } from 'next/server';
import { run } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'sem_bazaar_super_secret_key';

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, name, usn, branch, phone, address, logo, password } = body;

        if (!email || !email.endsWith('@rvce.edu.in')) {
            return NextResponse.json({ error: 'Only @rvce.edu.in email addresses are allowed.' }, { status: 400 });
        }
        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            await run(`INSERT INTO users (email, name, usn, branch, phone, address, logo, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [email, name, usn, branch, phone, address, logo, hashedPassword]);
            
            const token = jwt.sign({ email }, JWT_SECRET);
            return NextResponse.json({ token, email, name, usn, branch, logo, phone, address });
        } catch (dbError) {
            return NextResponse.json({ error: 'User already exists or database error.' }, { status: 400 });
        }
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
