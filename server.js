const express = require('express');
const axios = require('axios'); // Import axios for sending HTTP requests
const app = express();
const startTime = Date.now(); // Store the time when the server started

let totalRequests = 0; // Counter for total requests received
let pingCount = 0; // Counter for successful pings

// Website to ping
const websiteURL = 'https://faizur.onrender.com'; // Replace with the actual URL

// Middleware to count each request
app.use((req, res, next) => {
    totalRequests++;
    next();
});

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

// Set interval to ping the website every 1 minute 35 seconds (95 seconds)
setInterval(pingWebsite, 95 * 1000); // 95 seconds

// Route for the root URL
app.get('/', (req, res) => {
    const uptime = process.uptime(); // Get uptime in seconds
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const formattedUptime = `${hours}h ${minutes}m ${seconds}s`;

    res.send(`
        <h1>Bot is running</h1>
        <p>Uptime: ${formattedUptime}</p>
        <p>Total requests received: ${totalRequests}</p>
        <p>Total successful pings: ${pingCount}</p>
    `);
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    pingWebsite(); // Initial ping when the server starts
});
