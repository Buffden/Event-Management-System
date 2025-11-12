import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const venueData = [
  {
    name: 'Grand Conference Center',
    address: '123 Main Street, Downtown District, City Center, 10001',
    capacity: 800,
    openingTime: '06:00',
    closingTime: '22:00'
  },
  {
    name: 'Tech Innovation Hub',
    address: '456 Innovation Drive, Tech Quarter, Silicon Valley, 94000',
    capacity: 350,
    openingTime: '06:00',
    closingTime: '21:00'
  },
  {
    name: 'Community Hall',
    address: '789 Community Lane, Residential Area, Suburbia, 20002',
    capacity: 150,
    openingTime: '06:00',
    closingTime: '23:00'
  },
  {
    name: 'University Auditorium',
    address: '321 Campus Boulevard, University District, College Town, 30003',
    capacity: 600,
    openingTime: '06:00',
    closingTime: '24:00'
  },
  {
    name: 'Business Center',
    address: '654 Corporate Plaza, Financial District, Metro City, 40004',
    capacity: 300,
    openingTime: '06:00',
    closingTime: '20:30'
  },
  {
    name: 'Cultural Arts Center',
    address: '987 Arts Avenue, Cultural Quarter, Heritage City, 50005',
    capacity: 250,
    openingTime: '06:00',
    closingTime: '22:00'
  },
  {
    name: 'Sports Complex',
    address: '147 Athletic Way, Sports District, Fitness City, 60006',
    capacity: 200,
    openingTime: '06:00',
    closingTime: '23:00'
  },
  {
    name: 'Hotel Conference Room',
    address: '258 Hospitality Street, Hotel District, Tourist City, 70007',
    capacity: 100,
    openingTime: '06:00',
    closingTime: '22:00'
  },
  {
    name: 'Exhibition Center',
    address: '741 Trade Fair Boulevard, Exhibition District, Commerce City, 90009',
    capacity: 500,
    openingTime: '06:00',
    closingTime: '18:00'
  }
];

async function main() {
  console.log('🌱 Starting venue seeding...');

  try {
    // Check if venues already exist
    const existingVenues = await prisma.venue.count();

    if (existingVenues > 0) {
      console.log(`📊 Found ${existingVenues} existing venues. Skipping seeding to avoid duplicates.`);
      return;
    }

    // Create venues
    for (const venue of venueData) {
      const createdVenue = await prisma.venue.create({
        data: venue
      });
      console.log(`✅ Created venue: ${createdVenue.name} (ID: ${createdVenue.id})`);
    }

    console.log(`🎉 Successfully seeded ${venueData.length} venues!`);
  } catch (error) {
    console.error('❌ Error seeding venues:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Seeding failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
  });
