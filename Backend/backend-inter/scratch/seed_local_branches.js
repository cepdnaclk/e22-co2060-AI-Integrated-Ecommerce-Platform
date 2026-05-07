import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function seedSampleBranches() {
  try {
    // Connect to local DB for seeding from host
    const mongoURI = 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    const branchSchema = new mongoose.Schema({}, { strict: false });
    const Branch = mongoose.model('Branch_Seed', branchSchema, 'courierbranches');

    const sampleBranches = [
      { branchCode: "SLCEN-01", branchName: "Colombo Hub", location: { lat: 6.9271, lng: 79.8612 }, status: "approved" },
      { branchCode: "SLCEN-02", branchName: "Kandy Hub", location: { lat: 7.2906, lng: 80.6337 }, status: "approved" },
      { branchCode: "SLCEN-03", branchName: "Galle Hub", location: { lat: 6.0535, lng: 80.2210 }, status: "approved" },
      { branchCode: "SLCEN-07", branchName: "Anuradhapura Hub", location: { lat: 8.3114, lng: 80.4037 }, status: "approved" }
    ];

    for (const b of sampleBranches) {
      await Branch.findOneAndUpdate({ branchCode: b.branchCode }, b, { upsert: true });
    }

    console.log("Seeded 4 sample branches into local DB");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedSampleBranches();
