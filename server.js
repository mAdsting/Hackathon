require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('Frontend'));

// Initialize Twilio client with fallback values
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID || 'AC0271506d28b5eae03864a4e035544912',
    process.env.TWILIO_AUTH_TOKEN || 'e32dd81ac5a6044cb2bd3240cdd54521'
);

// Twilio phone numbers
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+12534652854';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '+12534652854';

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'index.html'));
});

// Send SMS endpoint
app.post('/api/send-sms', async (req, res) => {
    try {
        const { to, message } = req.body;
        
        const result = await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: to
        });

        res.json({ success: true, messageId: result.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Send WhatsApp message endpoint
app.post('/api/send-whatsapp', async (req, res) => {
    try {
        const { to, message } = req.body;
        
        const result = await twilioClient.messages.create({
            body: message,
            from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${to}`
        });

        res.json({ success: true, messageId: result.sid });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Send email endpoint (placeholder for future implementation)
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, message } = req.body;
        
        // TODO: Implement email sending logic
        console.log('Email would be sent:', { to, subject, message });
        
        res.json({ success: true, message: 'Email sending not implemented yet' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Twilio configuration:');
    console.log('- Account SID:', process.env.TWILIO_ACCOUNT_SID || 'AC0271506d28b5eae03864a4e035544912');
    console.log('- Phone Number:', TWILIO_PHONE_NUMBER);
}); 