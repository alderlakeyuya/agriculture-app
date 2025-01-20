const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

const dataFilePath = path.join(__dirname, 'data.json');

const PDFDocument = require('pdfkit');
const { writeToString } = require('@fast-csv/format');

const bcrypt = require('bcrypt'); // パスワードのハッシュ化用
const jwt = require('jsonwebtoken'); // 認証トークン用
const SECRET_KEY = 'your_secret_key'; // 任意の秘密鍵を設定

const usersFilePath = path.join(__dirname, 'users.json'); // ユーザーデータ保存用

// ミドルウェアの設定
app.use(bodyParser.json()); // JSON形式のリクエストボディを解析
app.use(express.static('public')); // 静的ファイルの提供

// ルートエンドポイント
app.get('/', (req, res) => {
    res.send('Hello, Agriculture Management App!');
});

// 天気情報取得エンドポイント
const API_KEY = '72964f2863156116c8e8dd4c093167e8'; // OpenWeatherで取得したAPIキーを入力
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// 認証ミドルウェア
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send('Access Denied');
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send('Invalid Token');
        }
        req.user = user;
        next();
    });
}

app.get('/weather', async (req, res) => {
    const city = req.query.city || 'Saitama'; // デフォルトで埼玉の天気を取得
    const url = `${BASE_URL}?q=${city}&appid=${API_KEY}&units=metric`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching weather data');
    }
});

// 作業記録の保存エンドポイント (POST)
app.post('/record', authenticateToken, (req, res) => {
    const newRecord = { id: uuidv4(), ...req.body, username: req.user.username }; // カテゴリも含む

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];
        records.push(newRecord);

        fs.writeFile(dataFilePath, JSON.stringify(records, null, 2), (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error saving data');
            }
            res.status(200).send('Record saved');
        });
    });
});

// リストア用エンドポイント
app.post('/records/restore', authenticateToken, (req, res) => {
    const newRecords = req.body;

    if (!Array.isArray(newRecords)) {
        return res.status(400).send('Invalid data format');
    }

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];
        newRecords.forEach(record => {
            record.id = uuidv4(); // 新しいIDを付与
            record.username = req.user.username; // 現在のユーザーを割り当て
            records.push(record);
        });

        fs.writeFile(dataFilePath, JSON.stringify(records, null, 2), (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error saving data');
            }

            res.status(200).send('Records restored successfully');
        });
    });
});


// 作業記録の取得エンドポイント (GET)
app.get('/records', authenticateToken, (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];
        res.json(records);
    });
});

// バックアップ用エンドポイント
app.get('/records/backup', authenticateToken, (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];
        const userRecords = records.filter(record => record.username === req.user.username); // 自分の記録のみ

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="backup.json"');
        res.send(JSON.stringify(userRecords, null, 2));
    });
});

// 作業記録の通知エンドポイント (GET)
app.get('/records/notifications', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];
        const today = new Date().toISOString().slice(0, 10);

        const upcomingTasks = records.filter(record => {
            return record.dueDate && record.dueDate >= today;
        });

        res.json(upcomingTasks);
    });
});

// 作業記録の一括削除エンドポイント
app.delete('/records', (req, res) => {
    const { date, keyword } = req.query;

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        let records = data ? JSON.parse(data) : [];

        if (date) {
            records = records.filter(record => record.date !== date);
        }
        if (keyword) {
            records = records.filter(record => !record.content.includes(keyword));
        }

        fs.writeFile(dataFilePath, JSON.stringify(records, null, 2), (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error saving data');
            }
            res.status(200).send('Records deleted');
        });
    });
});

// 作業記録の統計エンドポイント 
app.get('/records/stats', (req, res) => { // (add here)
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];
        const stats = {};

        // 月ごとの作業数を集計
        records.forEach(record => {
            const month = record.date.slice(0, 7); // YYYY-MM形式
            stats[month] = (stats[month] || 0) + 1;
        });

        const months = Object.keys(stats).sort();
        const counts = months.map(month => stats[month]);

        res.json({ months, counts });
    });
});

// カテゴリ別作業数の統計エンドポイント
app.get('/records/category-stats', (req, res) => { 
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];
        const stats = {};

        // カテゴリごとの作業数を集計
        records.forEach(record => {
            const category = record.category || 'その他';
            stats[category] = (stats[category] || 0) + 1;
        });

        res.json(stats);
    });
});

// 作業記録の検索エンドポイント
app.get('/records/search', (req, res) => {
    const { date, keyword } = req.query;

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        let records = data ? JSON.parse(data) : [];

        if (date) {
            records = records.filter(record => record.date === date);
        }
        if (keyword) {
            records = records.filter(record => record.content.includes(keyword));
        }

        res.json(records);
    });
});

//pdfkitのインポート
app.get('/records/pdf', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // 日本語フォントを設定 (add here)
        const fontPath = path.join(__dirname, 'public/fonts/NotoSansJP-Regular.otf');
        doc.font(fontPath);

        doc.fontSize(16).text('作業記録レポート', { align: 'center' }).moveDown();

        records.forEach((record, index) => {
            doc.fontSize(12).text(`${index + 1}. 日付: ${record.date}, 内容: ${record.content}`);
        });

        doc.end();
    });
});

//fast-csvのインポート
app.get('/records/csv', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', async (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        const records = data ? JSON.parse(data) : [];

        try {
            const csvData = await writeToString(records, { headers: true });
            const bom = '\uFEFF'; // BOMを追加 (add here)
            res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
            res.setHeader('Content-Disposition', 'attachment; filename="records.csv"');
            res.send(bom + csvData); // BOM付きで送信
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating CSV');
        }
    });
});

// 作業記録の編集エンドポイント (PUT)
app.put('/record/:id', authenticateToken, (req, res) => {
    const recordId = req.params.id;
    const updatedRecord = req.body;

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        let records = data ? JSON.parse(data) : [];
        const index = records.findIndex(record => record.id === recordId);

        if (index === -1) {
            return res.status(404).send('Record not found');
        }

        records[index] = { ...records[index], ...updatedRecord };

        fs.writeFile(dataFilePath, JSON.stringify(records, null, 2), (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error saving data');
            }
            res.status(200).send('Record updated');
        });
    });
});

// 作業記録の削除エンドポイント (DELETE)
app.delete('/record/:id', authenticateToken, (req, res) => {
    const recordId = req.params.id;

    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading data file');
        }

        let records = data ? JSON.parse(data) : [];
        records = records.filter(record => record.id !== recordId);

        fs.writeFile(dataFilePath, JSON.stringify(records, null, 2), (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error saving data');
            }
            res.status(200).send('Record deleted');
        });
    });
});

// ユーザー登録エンドポイント
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { username, password: hashedPassword };

        fs.readFile(usersFilePath, 'utf8', (err, data) => {
            let users = [];
            if (!err) users = JSON.parse(data || '[]');

            if (users.find(u => u.username === username)) {
                return res.status(400).send('User already exists');
            }

            users.push(user);

            fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error saving user');
                }

                res.status(201).send('User registered successfully');
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// ユーザーログインエンドポイント
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    fs.readFile(usersFilePath, 'utf8', async (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading users file');
        }

        const users = JSON.parse(data || '[]');
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).send('Invalid username or password');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).send('Invalid username or password');
        }

        // JWTを生成
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    });
});

// サーバーの起動
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});