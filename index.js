// 完全なAPI実装: Agriculture Management App

const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'A3f#x8!z_SecretKey';

const app = express();
const PORT = 3000;

// PostgreSQL接続設定
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ミドルウェア設定
app.use(bodyParser.json());
app.use(express.static('public'));

// ユーザー登録
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await pool.query('INSERT INTO Users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.status(201).send('User registered');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error registering user');
    }
});

// ログイン
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM Users WHERE username = $1', [username]);
        if (result.rowCount === 0) return res.status(404).send('User not found');

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).send('Invalid credentials');

        const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error logging in');
    }
});

// 認証ミドルウェア
function authenticate(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send('Token required');

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).send('Invalid token');
        req.userId = decoded.userId;
        next();
    });
}

// 作業記録取得
app.get('/records', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Work_Records');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving work records');
    }
});

// 作業記録作成
app.post('/records', authenticate, async (req, res) => {
    const { date, content, category, dueDate } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO Work_Records (date, content, category, dueDate) VALUES ($1, $2, $3, $4) RETURNING *',
            [date, content, category, dueDate]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding work record');
    }
});

// 作業記録削除
app.delete('/records/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM Work_Records WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) return res.status(404).send('Record not found');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting work record');
    }
});

// 野菜関連
app.get('/vegetables', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Vegetable_Pricing');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving vegetable data');
    }
});

app.post('/vegetables', authenticate, async (req, res) => {
    const { vegetable_name, harvest_quantity, unit, remarks } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO Vegetable_Pricing (vegetable_name, harvest_quantity, unit, remarks) VALUES ($1, $2, $3, $4) RETURNING *',
            [vegetable_name, harvest_quantity, unit, remarks]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding vegetable data');
    }
});

app.delete('/vegetables/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM Vegetable_Pricing WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) return res.status(404).send('Vegetable not found');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting vegetable data');
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server is running`);
});
