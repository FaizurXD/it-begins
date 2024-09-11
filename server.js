const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const querystring = require('querystring');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Encrypt/Decrypt functions
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Must be 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16 bytes

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Payment Endpoint
app.post('/payment/process', async (req, res) => {
    const { amount, username, serverType, totalPrice, items, callbackUrl } = req.body;

    // Encrypt the amount
    const encryptedAmount = encrypt(amount);

    // Generate the URL structure for Cryptomus
    const queryParams = {
        amount: encryptedAmount,
        username,
        serverType,
        totalPrice,
        items: encodeURIComponent(items),
        callbackUrl
    };

    const baseUrl = 'https://api.cryptomus.com/v1/payment/create';
    const fullUrl = `${baseUrl}?${querystring.stringify(queryParams)}`;

    // Redirect user to payment URL
    res.redirect(fullUrl);
});

// Encryption Endpoint
app.post('/encrypt', (req, res) => {
    const { amount } = req.body;
    const encryptedAmount = encrypt(amount);
    res.json({ encryptedAmount });
});

// Payment Callback Endpoint
app.post('/payment/callback', async (req, res) => {
    const { transaction_id, status, encrypted_amount } = req.body;

    // Decrypt the amount
    const decryptedAmount = decrypt(encrypted_amount);

    // Notify Discord
    await sendNotificationToDiscord(transaction_id, decryptedAmount, status);

    // Redirect based on payment status
    if (status === 'success') {
        res.redirect(`/payment/success?tid=${transaction_id}`);
    } else {
        res.redirect(`/payment/failure?tid=${transaction_id}`);
    }
});

// Function to send notification to Discord
async function sendNotificationToDiscord(transactionId, amount, status) {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    client.once('ready', async () => {
        const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('Payment Notification')
                .addFields(
                    { name: 'Transaction ID', value: transactionId },
                    { name: 'Amount', value: amount },
                    { name: 'Status', value: status }
                )
                .setColor(status === 'success' ? 'Green' : 'Red');

            await channel.send({ embeds: [embed] });
        }

        client.destroy();
    });

    client.login(process.env.DISCORD_BOT_TOKEN);
}

// Success and Failure Pages
app.get('/payment/success', (req, res) => {
    const { tid } = req.query;
    res.send(`
        <html>
        <head><title>Payment Success</title></head>
        <body>
            <h1>Payment Successful</h1>
            <p>Transaction ID: ${tid}</p>
            <p>Your payment was successful! Thank you for your purchase.</p>
        </body>
        </html>
    `);
});

app.get('/payment/failure', (req, res) => {
    const { tid } = req.query;
    res.send(`
        <html>
        <head><title>Payment Failed</title></head>
        <body>
            <h1>Payment Failed</h1>
            <p>Transaction ID: ${tid}</p>
            <p>Unfortunately, your payment could not be processed. Please try again.</p>
        </body>
        </html>
    `);
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
