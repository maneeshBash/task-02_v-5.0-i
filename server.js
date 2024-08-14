const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 4040;
const SECRET = 'Manish@123'; 

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Serve static files 
app.use(express.static(path.join(__dirname, 'public')));


// Auth routes
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).send('email and password required.');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Store user in your user database, for simplicity storing in memory here
        const users = JSON.parse(await fs.readFile(path.join(__dirname, 'usersCredentials.json')));
        users.push({ email, password: hashedPassword });
        await fs.writeFile(path.join(__dirname, 'usersCredentials.json'), JSON.stringify(users, null, 2));
        res.status(201).send('User created');
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const users = JSON.parse(await fs.readFile(path.join(__dirname, 'usersCredentials.json')));
        const user = users.find(user => user.email === email);
        if (user && await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ email: user.email }, SECRET,({expiresIn:'1h'}));
            res.json({ accessToken });
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Fetch users with authentication
app.get('/users', authenticateToken, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    try {
        const data = await fs.readFile(path.join(__dirname, 'users.json'));
        const users = JSON.parse(data);
        const total = users.length;
        const paginatedUsers = users.slice(startIndex, startIndex + limit);
        res.json({ total, users: paginatedUsers });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read user data' });
    }
});

// Add, update, and delete users with authentication
app.post('/users', authenticateToken, async (req, res) => {
    try {
        const newUser = req.body;
        const data = await fs.readFile(path.join(__dirname, 'users.json'));
        const users = JSON.parse(data);
        users.push(newUser);
        await fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save user data' });
    }
});

app.delete('/users/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = await fs.readFile(path.join(__dirname, 'users.json'));
        let users = JSON.parse(data);
        users = users.filter((user, index) => index !== id);
        await fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user data' });
    }
});

app.put('/users/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updateUser = req.body;
        const data = await fs.readFile(path.join(__dirname, 'users.json'));
        let users = JSON.parse(data);
        users[id] = updateUser;
        await fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
        res.status(200).json(updateUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user data' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
});
