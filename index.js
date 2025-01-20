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
  user: 'postgres',
  host: 'localhost',
  database: 'agriculture',
  password: 'dog1101N', // パスワードを設定してください
  port: 5432,
});

// ミドルウェア設定
app.use(bodyParser.json());

app.use(express.static('public'));

// エンドポイント一覧

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// 1. 野菜関連
app.get('/vegetables', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Vegetable_Pricing');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving vegetable data');
  }
});

app.post('/vegetables', async (req, res) => {
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

app.put('/vegetables/:id', async (req, res) => {
  const { id } = req.params;
  const { vegetable_name, harvest_quantity, unit, remarks } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Vegetable_Pricing SET vegetable_name = $1, harvest_quantity = $2, unit = $3, remarks = $4 WHERE id = $5 RETURNING *',
      [vegetable_name, harvest_quantity, unit, remarks, id]
    );
    if (result.rowCount === 0) return res.status(404).send('Vegetable not found');
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating vegetable data');
  }
});

app.delete('/vegetables/:id', async (req, res) => {
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

// 2. 作業記録関連
app.get('/work-records', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Work_Records');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving work records');
  }
});

app.post('/work-records', async (req, res) => {
  const { user_id, date, work_content, field_name, hours_worked, labor_cost_per_hour, remarks } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Work_Records (user_id, date, work_content, field_name, hours_worked, labor_cost_per_hour, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, date, work_content, field_name, hours_worked, labor_cost_per_hour, remarks]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding work record');
  }
});

app.put('/work-records/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id, date, work_content, field_name, hours_worked, labor_cost_per_hour, remarks } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Work_Records SET user_id = $1, date = $2, work_content = $3, field_name = $4, hours_worked = $5, labor_cost_per_hour = $6, remarks = $7 WHERE id = $8 RETURNING *',
      [user_id, date, work_content, field_name, hours_worked, labor_cost_per_hour, remarks, id]
    );
    if (result.rowCount === 0) return res.status(404).send('Work record not found');
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating work record');
  }
});

app.delete('/work-records/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Work_Records WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).send('Work record not found');
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting work record');
  }
});

// 3. 消耗品関連
app.get('/supplies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Supplies');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving supplies data');
  }
});

app.post('/supplies', async (req, res) => {
  const { name, unit, price_per_unit } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Supplies (name, unit, price_per_unit) VALUES ($1, $2, $3) RETURNING *',
      [name, unit, price_per_unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding supply');
  }
});

app.put('/supplies/:id', async (req, res) => {
  const { id } = req.params;
  const { name, unit, price_per_unit } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Supplies SET name = $1, unit = $2, price_per_unit = $3 WHERE id = $4 RETURNING *',
      [name, unit, price_per_unit, id]
    );
    if (result.rowCount === 0) return res.status(404).send('Supply not found');
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating supply');
  }
});

app.delete('/supplies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Supplies WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).send('Supply not found');
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting supply');
  }
});

// 4. 機械関連
app.get('/equipment', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Equipment');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving equipment data');
    }
  });
  
  app.post('/equipment', async (req, res) => {
    const { name, model, manufacturer, purchase_date, purchase_type, estimated_years_since_manufacture, purchaser, purchase_cost } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Equipment (name, model, manufacturer, purchase_date, purchase_type, estimated_years_since_manufacture, purchaser, purchase_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [name, model, manufacturer, purchase_date, purchase_type, estimated_years_since_manufacture, purchaser, purchase_cost]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error adding equipment');
    }
  });
  
  app.put('/equipment/:id', async (req, res) => {
    const { id } = req.params;
    const { name, model, manufacturer, purchase_date, purchase_type, estimated_years_since_manufacture, purchaser, purchase_cost } = req.body;
    try {
      const result = await pool.query(
        'UPDATE Equipment SET name = $1, model = $2, manufacturer = $3, purchase_date = $4, purchase_type = $5, estimated_years_since_manufacture = $6, purchaser = $7, purchase_cost = $8 WHERE id = $9 RETURNING *',
        [name, model, manufacturer, purchase_date, purchase_type, estimated_years_since_manufacture, purchaser, purchase_cost, id]
      );
      if (result.rowCount === 0) return res.status(404).send('Equipment not found');
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating equipment');
    }
  });
  
  app.delete('/equipment/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM Equipment WHERE id = $1 RETURNING *', [id]);
      if (result.rowCount === 0) return res.status(404).send('Equipment not found');
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error deleting equipment');
    }
  });
  
  // 5. メンテナンス関連
  app.get('/maintenance-records', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Maintenance_Records');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving maintenance records');
    }
  });
  
  app.post('/maintenance-records', async (req, res) => {
    const { equipment_id, maintenance_date, worker_count, hours_worked, labor_cost_per_hour, remarks } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Maintenance_Records (equipment_id, maintenance_date, worker_count, hours_worked, labor_cost_per_hour, remarks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [equipment_id, maintenance_date, worker_count, hours_worked, labor_cost_per_hour, remarks]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error adding maintenance record');
    }
  });
  
  app.put('/maintenance-records/:id', async (req, res) => {
    const { id } = req.params;
    const { equipment_id, maintenance_date, worker_count, hours_worked, labor_cost_per_hour, remarks } = req.body;
    try {
      const result = await pool.query(
        'UPDATE Maintenance_Records SET equipment_id = $1, maintenance_date = $2, worker_count = $3, hours_worked = $4, labor_cost_per_hour = $5, remarks = $6 WHERE id = $7 RETURNING *',
        [equipment_id, maintenance_date, worker_count, hours_worked, labor_cost_per_hour, remarks, id]
      );
      if (result.rowCount === 0) return res.status(404).send('Maintenance record not found');
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating maintenance record');
    }
  });
  
  app.delete('/maintenance-records/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM Maintenance_Records WHERE id = $1 RETURNING *', [id]);
      if (result.rowCount === 0) return res.status(404).send('Maintenance record not found');
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error deleting maintenance record');
    }
  });

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

  
  // サーバー起動
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });