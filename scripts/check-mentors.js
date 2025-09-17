const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMentors() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully');
    
    const db = client.db();
    const mentorsCollection = db.collection('mentors');
    
    // Check total mentors
    const totalMentors = await mentorsCollection.countDocuments();
    console.log(`Total mentors in database: ${totalMentors}`);
    
    // Check dummy mentors specifically
    const dummyMentors = await mentorsCollection.find({
      email: { $in: [
        'sarah.johnson@techcorp.com',
        'michael.chen@startup.io',
        'priya.patel@designstudio.com',
        'james.wilson@fintech.com',
        'emily.davis@consultancy.com'
      ]}
    }).toArray();
    
    console.log(`Dummy mentors found: ${dummyMentors.length}`);
    
    if (dummyMentors.length > 0) {
      console.log('\nDummy mentors:');
      dummyMentors.forEach((mentor, index) => {
        console.log(`${index + 1}. ${mentor.name} (${mentor.email}) - Status: ${mentor.status}, Active: ${mentor.isActive}`);
        console.log(`   Expertise: ${mentor.expertise.map(e => e.area).join(', ')}`);
        console.log(`   Session Types: ${mentor.sessionTypes.map(st => st.type).join(', ')}`);
        console.log(`   Rating: ${mentor.rating.average} (${mentor.rating.count} reviews)`);
        console.log('');
      });
    } else {
      console.log('No dummy mentors found in database');
    }
    
    // Check all mentors
    if (totalMentors > 0) {
      console.log('\nAll mentors in database:');
      const allMentors = await mentorsCollection.find({}).toArray();
      allMentors.forEach((mentor, index) => {
        console.log(`${index + 1}. ${mentor.name} (${mentor.email}) - Status: ${mentor.status}, Active: ${mentor.isActive}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

checkMentors();