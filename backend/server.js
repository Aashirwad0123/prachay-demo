require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('Fatal: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('Fatal: JWT_SECRET is too short for production use (need 32+ characters).');
  process.exit(1);
}

const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
