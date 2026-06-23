require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║  🚀 Long Hưng E-commerce Backend Server           ║
║     Running at http://localhost:${PORT}           ║
║                                                    ║
║  Environment: ${process.env.NODE_ENV}
║  Database: ${process.env.DB_NAME}                 ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
