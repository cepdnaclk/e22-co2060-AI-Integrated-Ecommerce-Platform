import mongoose from 'mongoose';

const branchCoords = {
  "SLCEN-01": { lat: 6.9271, lng: 79.8612 }, // Colombo
  "SLCEN-02": { lat: 7.2906, lng: 80.6337 }, // Kandy
  "SLCEN-03": { lat: 6.0535, lng: 80.2210 }, // Galle
  "SLCEN-04": { lat: 9.6615, lng: 80.0255 }, // Jaffna
  "SLCEN-05": { lat: 7.2089, lng: 79.8351 }, // Negombo
  "SLCEN-06": { lat: 7.4817, lng: 80.3609 }, // Kurunegala
  "SLCEN-07": { lat: 8.3114, lng: 80.4037 }, // Anuradhapura
  "SLCEN-08": { lat: 7.7302, lng: 81.6747 }, // Batticaloa
  "SLCEN-09": { lat: 5.9549, lng: 80.5550 }, // Matara
  "SLCEN-10": { lat: 6.6781, lng: 80.3992 }  // Ratnapura
};

import dotenv from 'dotenv';
dotenv.config();

async function seedBranchCoords() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    // Dynamic model
    const branchSchema = new mongoose.Schema({}, { strict: false });
    const Branch = mongoose.model('CourierBranch_Seed', branchSchema, 'courierbranches');
    
    const branches = await Branch.find({});
    console.log(`Found ${branches.length} branches`);

    for (const branch of branches) {
      const coords = branchCoords[branch.branchCode];
      if (coords) {
        await Branch.updateOne({ _id: branch._id }, { $set: { location: coords } });
        console.log(`Updated ${branch.branchCode} with ${JSON.stringify(coords)}`);
      } else {
        // Default to Colombo if not in list
        await Branch.updateOne({ _id: branch._id }, { $set: { location: { lat: 6.9271, lng: 79.8612 } } });
        console.log(`Updated ${branch.branchCode} with default Colombo coords`);
      }
    }

    console.log("Seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedBranchCoords();
