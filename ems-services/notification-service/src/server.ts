import { config } from 'dotenv';
config();

import { NotificationConsumer } from './consumers/notification.consumer';
import { BookingEventConsumer } from './consumers/booking-event.consumer';
import { TicketEventConsumer } from './consumers/ticket-event.consumer';
import { EventStatusConsumer } from './consumers/event-status.consumer';

async function startServer() {
    const rabbitmqUrl = process.env.RABBITMQ_URL;
    if (!rabbitmqUrl) {
        throw new Error("RABBITMQ_URL environment variable not set!");
    }

    console.log(`Starting server on ${rabbitmqUrl}`);

    const notificationConsumer = new NotificationConsumer(rabbitmqUrl);
    const bookingEventConsumer = new BookingEventConsumer(rabbitmqUrl);
    const ticketEventConsumer = new TicketEventConsumer(rabbitmqUrl);
    const eventStatusConsumer = new EventStatusConsumer(rabbitmqUrl);

    await notificationConsumer.start();
    await bookingEventConsumer.start();
    await ticketEventConsumer.start();
    await eventStatusConsumer.start();

    // Handle graceful shutdown
    const gracefulShutdown = async () => {
        console.log('Received shutdown signal.');
        await notificationConsumer.stop();
        await bookingEventConsumer.stop();
        await ticketEventConsumer.stop();
        await eventStatusConsumer.stop();
        process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
}

startServer().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});