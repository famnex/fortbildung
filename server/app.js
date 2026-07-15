require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');

const { sequelize, User, Setting, Training, Registration } = require('./models');
const { sendEmail } = require('./utils/email');

// Import routes
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');
const trainingRoutes = require('./routes/trainings');
const registrationRoutes = require('./routes/registrations');
const participationRoutes = require('./routes/participations');
const pdfRoutes = require('./routes/pdf');
const logRoutes = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3018;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/fortbildung/api/auth', authRoutes);
app.use('/fortbildung/api/settings', settingsRoutes);
app.use('/fortbildung/api/users', userRoutes);
app.use('/fortbildung/api/trainings', trainingRoutes);
app.use('/fortbildung/api/registrations', registrationRoutes);
app.use('/fortbildung/api/participations', participationRoutes);
app.use('/fortbildung/api/pdfs', pdfRoutes);
app.use('/fortbildung/api/admin', logRoutes);

// Static Hosting of built React files (client/dist) under /fortbildung
const clientDistPath = path.join(__dirname, '../client/dist');
app.use('/fortbildung', express.static(clientDistPath));

// Redirect / to /fortbildung
app.get('/', (req, res) => {
  res.redirect('/fortbildung');
});

// React Router Fallback for client-side routing
app.get('/fortbildung/*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// node-cron: Tägliche E-Mail-Erinnerung um 8:00 Uhr morgens
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily email reminder cron job...');
  try {
    const trainings = await Training.findAll({ where: { status: 'published' } });
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const t of trainings) {
      if (!t.dates || t.dates.length === 0) continue;

      const firstDate = new Date(t.dates[0].start_datetime);
      
      // Send reminder if the training starts tomorrow
      if (firstDate.toDateString() === tomorrow.toDateString()) {
        const regs = await Registration.findAll({ 
          where: { training_id: t.training_id, status: 'registered' } 
        });

        for (const r of regs) {
          await sendEmail(
            r.user_email,
            `Erinnerung: Fortbildung morgen - ${t.title}`,
            `<html><body>
            <h2>Erinnerung an Ihre bevorstehende Fortbildung</h2>
            <p>Hallo ${r.user_name},</p>
            <p>dies ist eine freundliche Erinnerung, dass morgen die Fortbildung <strong>"${t.title}"</strong> beginnt.</p>
            <p><strong>Ort:</strong> ${t.location}</p>
            <p>Wir wünschen Ihnen eine erfolgreiche Teilnahme!</p>
            </body></html>`
          );
        }
      }
    }
  } catch (error) {
    console.error('Error running daily email reminder cron job:', error);
  }
});

// Sync database and start server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync models
    await sequelize.sync();
    console.log('Database synchronized.');

    // Initialize Default Admin
    const adminEmail = 'admin@fortbildung.mso';
    const adminUser = await User.findOne({ where: { email: adminEmail } });
    if (!adminUser) {
      await User.create({
        email: adminEmail,
        name: 'Administrator',
        password_hash: bcrypt.hashSync('admin123', 10),
        role: 'admin',
        auth_source: 'local',
        created_at: new Date().toISOString()
      });
      console.log('Default admin user created: admin@fortbildung.mso / admin123');
    }

    // Initialize Settings
    const settings = await Setting.findOne();
    if (!settings) {
      await Setting.create({});
      console.log('Default settings initialized.');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
  }
}

startServer();
