import { config } from 'dotenv';
config();

import { NotificationConsumer } from './consumers/notification.consumer';

async function startServer() {
    const rabbitmqUrl = process.env.RABBITMQ_URL;
    if (!rabbitmqUrl) {
        throw new Error("RABBITMQ_URL environment variable not set!");
    }

    console.log(`Starting server on ${rabbitmqUrl}`);

    const consumer = new NotificationConsumer(rabbitmqUrl);
    await consumer.start();

    // Handle graceful shutdown
    const gracefulShutdown = async () => {
        console.log('Received shutdown signal.');
        await consumer.stop();
        process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
}

startServer().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});