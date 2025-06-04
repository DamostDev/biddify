import { Sequelize } from 'sequelize';
import pg from 'pg'; 
import 'dotenv/config';

const sequelize = new Sequelize(process.env.NEONCONNECT, {
  dialect: 'postgres',
  dialectModule: pg, // Required for Neon
  logging: console.log, // Disable SQL logging in console
  pool: {
    max: 50,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test the connection
try {
  console.log("connecting to database")
  await sequelize.authenticate();
  console.log('✅ PostgreSQL connection established');
  await sequelize.sync({ alter: true });
  console.log('✅ All models synchronized (alter: true mode)');

} catch (error) {
  console.error('❌ Unable to connect to PostgreSQL:', error);
}

export default sequelize;