const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'e4a.sqlite');
const app = express();
const port = process.env.PORT || 3000;

const db = new sqlite3.Database(DB_PATH);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'e4a-africa-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Email transporter (using test account - replace with your own SMTP for production)
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'localhost',
  port: process.env.MAIL_PORT || 1025,
  auth: process.env.MAIL_USER ? {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  } : undefined
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: 'noreply@e4a.com',
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Email send error:', error.message);
  }
};

function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'buyer'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      sender_name TEXT NOT NULL,
      recipient_id INTEGER,
      recipient_email TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )`);

    db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
      if (err) {
        console.error('Error reading users count', err);
        return;
      }

      if (row.count === 0) {
        const passwordHash = bcrypt.hashSync('Admin123!', 10);
        db.run(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          ['E4A Admin', 'admin@e4a.com', passwordHash, 'admin']
        );
      }
    });

    db.get('SELECT COUNT(*) AS count FROM products', (err, row) => {
      if (err) {
        console.error('Error reading products count', err);
        return;
      }

      if (row.count === 0) {
        const seedProducts = [
          {
            title: 'Refurbished smartphone',
            category: 'Electronics',
            price: 120,
            description: 'A gently used smartphone in good condition. Perfect for daily use.',
            image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
            seller_name: 'Amina'
          },
          {
            title: 'Used leather jacket',
            category: 'Fashion',
            price: 45,
            description: 'Stylish leather jacket with minimal wear. Great for cool evenings.',
            image: 'https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=800&q=80',
            seller_name: 'Kwame'
          },
          {
            title: 'Second-hand laptop',
            category: 'Computing',
            price: 220,
            description: 'Lightweight laptop with good battery life. Ideal for students.',
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
            seller_name: 'Fatima'
          },
          {
            title: 'Kitchen mixer',
            category: 'Home',
            price: 35,
            description: 'Used kitchen mixer in working condition. Great for home cooking.',
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
            seller_name: 'John'
          },
          {
            title: 'Bicycle for sale',
            category: 'Sports',
            price: 80,
            description: 'Durable bicycle, ready for city rides, carefully maintained.',
            image: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?auto=format&fit=crop&w=800&q=80',
            seller_name: 'Grace'
          }
        ];

        const stmt = db.prepare('INSERT INTO products (title, category, price, description, image, seller_name) VALUES (?, ?, ?, ?, ?, ?)');
        seedProducts.forEach((product) => {
          stmt.run(product.title, product.category, product.price, product.description, product.image, product.seller_name);
        });
        stmt.finalize();
      }
    });
  });
}

initializeDatabase();

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please sign in first.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

app.get('/api/profile', (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }
  res.json({ user: req.session.user });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), hashedPassword, 'buyer'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'An account with that email already exists.' });
        }
        return res.status(500).json({ error: 'Unable to register. Please try again.' });
      }
      req.session.user = { id: this.lastID, name: name.trim(), email: email.trim().toLowerCase(), role: 'buyer' };
      res.json({ success: true, user: req.session.user });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.get('SELECT id, name, email, password, role FROM users WHERE email = ?', [email.trim().toLowerCase()], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ success: true, user: req.session.user });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/products', (req, res) => {
  const category = req.query.category;
  const sql = category && category !== 'All'
    ? 'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC'
    : 'SELECT * FROM products ORDER BY created_at DESC';

  const params = category && category !== 'All' ? [category] : [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to load products.' });
    }
    res.json({ products: rows });
  });
});

app.post('/api/products', requireLogin, (req, res) => {
  const { title, category, price, description, image } = req.body;
  if (!title || !category || !price || !description || !image) {
    return res.status(400).json({ error: 'All product fields are required.' });
  }

  db.run(
    'INSERT INTO products (title, category, price, description, image, seller_name) VALUES (?, ?, ?, ?, ?, ?)',
    [title.trim(), category.trim(), parseFloat(price), description.trim(), image.trim(), req.session.user.name || req.session.user.email],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Unable to add product.' });
      }
      res.json({ success: true, productId: this.lastID });
    }
  );
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Unable to delete product.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ success: true });
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  db.run(
    'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
    [name.trim(), email.trim(), message.trim()],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Unable to send message.' });
      }
      
      // Send email notification to admin
      sendEmail('admin@e4a.com', `New message from ${name}`, `
        <h2>New Contact Message</h2>
        <p><strong>From:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `);
      
      res.json({ success: true });
    }
  );
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  db.get('SELECT COUNT(*) AS products FROM products', (err, productRow) => {
    if (err) return res.status(500).json({ error: 'Unable to load stats.' });
    db.get('SELECT COUNT(*) AS contacts FROM contacts', (err2, contactRow) => {
      if (err2) return res.status(500).json({ error: 'Unable to load stats.' });
      db.get('SELECT COUNT(*) AS users FROM users', (err3, userRow) => {
        if (err3) return res.status(500).json({ error: 'Unable to load stats.' });
        db.get('SELECT COUNT(*) AS messages FROM messages', (err4, messageRow) => {
          if (err4) return res.status(500).json({ error: 'Unable to load stats.' });
          res.json({ stats: { products: productRow.products, contacts: contactRow.contacts, users: userRow.users, messages: messageRow.messages } });
        });
      });
    });
  });
});

app.get('/api/admin/contacts', requireAdmin, (req, res) => {
  db.all('SELECT * FROM contacts ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to load contact messages.' });
    }
    res.json({ contacts: rows });
  });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to load products.' });
    }
    res.json({ products: rows });
  });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all('SELECT id, name, email, role FROM users ORDER BY id DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to load users.' });
    }
    res.json({ users: rows });
  });
});

// Messaging endpoints
app.post('/api/messages', requireLogin, (req, res) => {
  const { subject, body, recipient_email } = req.body;
  if (!subject || !body || !recipient_email) {
    return res.status(400).json({ error: 'Subject, message, and recipient email are required.' });
  }

  db.run(
    'INSERT INTO messages (sender_id, sender_name, recipient_email, subject, body) VALUES (?, ?, ?, ?, ?)',
    [req.session.user.id, req.session.user.name || req.session.user.email, recipient_email.trim().toLowerCase(), subject.trim(), body.trim()],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Unable to send message.' });
      }
      
      // Send email notification
      sendEmail(recipient_email, `New message: ${subject}`, `
        <h2>New Message from ${req.session.user.name || req.session.user.email}</h2>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${body}</p>
        <p><a href="http://localhost:3000/messages.html">View in E4A</a></p>
      `);
      
      res.json({ success: true, messageId: this.lastID });
    }
  );
});

app.get('/api/messages', requireLogin, (req, res) => {
  db.all(
    'SELECT * FROM messages WHERE sender_id = ? OR recipient_email = ? ORDER BY created_at DESC',
    [req.session.user.id, req.session.user.email],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Unable to load messages.' });
      }
      res.json({ messages: rows });
    }
  );
});

app.put('/api/messages/:id/read', requireLogin, (req, res) => {
  db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Unable to mark message as read.' });
    }
    res.json({ success: true });
  });
});

app.get('/api/admin/messages', requireAdmin, (req, res) => {
  db.all('SELECT * FROM messages ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to load messages.' });
    }
    res.json({ messages: rows });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`E4A app listening at http://localhost:${port}`);
});
