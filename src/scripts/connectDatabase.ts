import mongoose from 'mongoose';

const clientOptions = { serverApi: { version: '1' as const, strict: true, deprecationErrors: true } };

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      ...clientOptions,
      dbName: process.env.MONGODB_NAME
    });

    logger.log('database', 'Connected to database.');
  } catch (error) {
    logger.error('Failed to connect to database:');
    logger.error(error);

    process.exit(1);
  }
}

export default connectDatabase;
