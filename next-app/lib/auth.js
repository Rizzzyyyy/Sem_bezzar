import jwt from 'jsonwebtoken';

const JWT_SECRET = 'sem_bazaar_super_secret_key';

export function authenticate(req) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;
    
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}
