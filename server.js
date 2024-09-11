const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const startTime = Date.now();

let totalRequests = 0;
let pingCount = 0;

// Website to ping
const websiteURL = 'https://faizur.onrender.com';

// Middleware to count each request
app.use((req, res, next) => {
    totalRequests++;
    next();
});

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to serve static files (for CSS)
app.use(express.static(__dirname));

// Middleware for session management
app.use(session({
    secret: 'secret-key', // Change this to a more secure secret in production
    resave: false,
    saveUninitialized: true
}));

// Function to ping the website
const pingWebsite = async () => {
    try {
        const response = await axios.get(websiteURL);
        pingCount++;
        console.log(`Ping #${pingCount} to ${websiteURL} successful. Status code: ${response.status}`);
    } catch (error) {
        console.log(`Ping #${pingCount + 1} to ${websiteURL} failed. Error: ${error.message}`);
    }
};

// Set interval to ping the website every 1 minute 35 seconds
setInterval(pingWebsite, 95 * 1000);

// Middleware to check login status
const checkLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Route for the login page
app.get('/login', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Login</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #1e1e1e;
                        color: #e0e0e0;
                        margin: 0;
                        padding: 0;
                    }
                    .login-container {
                        max-width: 400px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #333;
                        border-radius: 8px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                    }
                    h1 {
                        text-align: center;
                        color: #fff;
                    }
                    form {
                        display: flex;
                        flex-direction: column;
                    }
                    label {
                        margin: 10px 0 5px;
                    }
                    input {
                        padding: 10px;
                        margin-bottom: 10px;
                        border: 1px solid #555;
                        border-radius: 4px;
                        background: #222;
                        color: #e0e0e0;
                    }
                    button {
                        padding: 10px;
                        border: none;
                        border-radius: 4px;
                        background: #4caf50;
                        color: #fff;
                        cursor: pointer;
                    }
                    button:hover {
                        background: #45a049;
                    }
                    a {
                        color: #4caf50;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="login-container">
                    <h1>Login</h1>
                    <form action="/login" method="POST">
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username" required>
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required>
                        <button type="submit">Login</button>
                    </form>
                </div>
            </body>
        </html>
    `);
});

// Route to handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' }).replace(':', '');
    const validPassword = `faizur-${currentTime}`;

    if (username === 'faizur' && password === validPassword) {
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.send('<h1>Invalid credentials</h1><a href="/login">Try again</a>');
    }
});

// Route for the root URL
app.get('/', checkLogin, (req, res) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const formattedUptime = `${hours}h ${minutes}m ${seconds}s`;

    res.send(`
        <html>
            <head>
                <title>Bot Status</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #1e1e1e;
                        color: #e0e0e0;
                        margin: 0;
                        padding: 0;
                    }
                    .status-container {
                        max-width: 400px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #333;
                        border-radius: 8px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                    }
                    h1 {
                        text-align: center;
                        color: #fff;
                    }
                </style>
            </head>
            <body>
                <div class="status-container">
                    <h1>Bot is running</h1>
                    <p>Uptime: ${formattedUptime}</p>
                    <p>Total requests received: ${totalRequests}</p>
                    <p>Total successful pings: ${pingCount}</p>
                </div>
            </body>
        </html>
    `);
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    pingWebsite(); // Initial ping when the server starts
});
