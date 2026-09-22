import mongoose from 'mongoose';

async function seedSellerCoords() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');
    console.log('✅ Connected to local MongoDB');

    const db = mongoose.connection.db;
    const sellers = db.collection('sellers');

    // Fetch all sellers and print their IDs + shop names first
    const allSellers = await sellers.find({}, { projection: { _id: 1, shopName: 1, addressLocation: 1 } }).toArray();
    console.log(`Found ${allSellers.length} sellers:`);
    allSellers.forEach(s => {
      console.log(`  - ${s._id}: ${s.shopName} | location: ${JSON.stringify(s.addressLocation)}`);
    });

    // Seed coordinates for all sellers that don't have them
    // Using a spread of Sri Lankan locations
    const sellerLocations = [
      { city: 'Kandy',           lat: 7.2906,  lng: 80.6337 },
      { city: 'Colombo',         lat: 6.9271,  lng: 79.8612 },
      { city: 'Matara',          lat: 5.9488,  lng: 80.5353 },
      { city: 'Galle',           lat: 6.0535,  lng: 80.2210 },
      { city: 'Jaffna',          lat: 9.6615,  lng: 80.0255 },
      { city: 'Trincomalee',     lat: 8.5874,  lng: 81.2152 },
      { city: 'Negombo',         lat: 7.2081,  lng: 79.8358 },
      { city: 'Anuradhapura',    lat: 8.3114,  lng: 80.4037 },
    ];

    let i = 0;
    for (const s of allSellers) {
      if (!s.addressLocation?.lat) {
        const loc = sellerLocations[i % sellerLocations.length];
        await sellers.updateOne(
          { _id: s._id },
          { $set: { addressLocation: { lat: loc.lat, lng: loc.lng, city: loc.city, verified: true, formattedAddress: `${loc.city}, Sri Lanka` } } }
        );
        console.log(`  ✅ Seeded ${s.shopName} -> ${loc.city} (${loc.lat}, ${loc.lng})`);
        i++;
      } else {
        console.log(`  ⏭  Skipping ${s.shopName} (already has coordinates)`);
      }
    }

    console.log('\n✅ Done seeding seller coordinates');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedSellerCoords();
