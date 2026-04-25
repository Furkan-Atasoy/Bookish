const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await poolPromise;

        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .query('INSERT INTO Users (Username, Email, PasswordHash) VALUES (@username, @email, @password)');

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.number === 2627) {
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password, isAdminRoute } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        const user = result.recordset[0];
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        if (user.IsBanned) {
            return res.status(403).json({ message: 'Your account has been permanently suspended from Bookish.' });
        }

        if (user.BannedUntil && new Date(user.BannedUntil) > new Date()) {
            const remaining = Math.ceil((new Date(user.BannedUntil) - new Date()) / (1000 * 60 * 60));
            return res.status(403).json({
                message: `Your account is temporarily suspended due to repeated policy violations. Suspension lifts in approximately ${remaining} hour(s).`
            });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

        if (user.Role === 'Admin' && (!isAdminRoute || isAdminRoute === 'false')) {
            return res.status(403).json({ message: 'Administrative accounts must login via the secure admin portal.' });
        }
        if (isAdminRoute && isAdminRoute !== 'false' && user.Role !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Account does not have administrative privileges.' });
        }

        const expiresIn = user.Role === 'Admin' ? '2h' : '24h';

        const token = jwt.sign(
            { id: user.UserID, username: user.Username, role: user.Role },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        res.json({ token, username: user.Username, role: user.Role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
