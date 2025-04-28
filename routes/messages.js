const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Get all messages and users for admin
router.get('/admin/messages', async (req, res) => {
    try {
        // Fetch all users (for recipient list)
        const users = await User.find().select('username email');
        
        // Mock messages data (replace with actual database implementation)
        const messages = [
            {
                id: '1',
                sender: 'System',
                subject: 'Welcome to NFT Marketplace',
                preview: 'Welcome to our platform...',
                date: new Date(),
                unread: true
            }
        ];

        res.json({ messages, users });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Send new message
router.post('/admin/messages', async (req, res) => {
    try {
        const { recipients, subject, message } = req.body;

        // Get recipient users
        const users = await User.find({ _id: { $in: recipients } });

        // Send email to each recipient
        const emailPromises = users.map(user => {
            const personalizedMessage = message.replace('[User]', user.username);

            return transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: user.email,
                subject: subject,
                text: personalizedMessage,
                html: personalizedMessage.replace(/\n/g, '<br>')
            });
        });

        await Promise.all(emailPromises);

        res.json({ message: 'Messages sent successfully' });
    } catch (error) {
        console.error('Error sending messages:', error);
        res.status(500).json({ message: 'Error sending messages' });
    }
});

// Get specific message
router.get('/admin/messages/:id', async (req, res) => {
    try {
        // Mock message data (replace with actual database implementation)
        const message = {
            id: req.params.id,
            sender: 'System',
            subject: 'Welcome to NFT Marketplace',
            content: 'Welcome to our platform...',
            date: new Date()
        };

        res.json(message);
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ message: 'Error fetching message' });
    }
});

module.exports = router;