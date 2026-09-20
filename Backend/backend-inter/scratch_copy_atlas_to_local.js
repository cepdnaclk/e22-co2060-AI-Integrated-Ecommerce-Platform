import mongoose from "mongoose";

const atlasUri = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const localUri = "mongodb://mongodb:27017/ecommerce";

async function copyData() {
  try {
    console.log("Connecting to Atlas...");
    const atlasConn = await mongoose.createConnection(atlasUri).asPromise();
    console.log("✅ Atlas connected!");

    console.log("Connecting to Local Docker Mongo...");
    const localConn = await mongoose.createConnection(localUri).asPromise();
    console.log("✅ Local Docker Mongo connected!");

    const collections = ["products", "selleroffers", "productvariants", "sellers", "users", "topproducts"];

    for (const colName of collections) {
      console.log(`Copying collection: ${colName}...`);
      const docs = await atlasConn.db.collection(colName).find().toArray();
      if (docs.length > 0) {
        await localConn.db.collection(colName).deleteMany({});
        await localConn.db.collection(colName).insertMany(docs);
        console.log(`  -> Copied ${docs.length} documents into ${colName}`);
      } else {
        console.log(`  -> Collection ${colName} is empty`);
      }
    }

    console.log("🎉 All data successfully copied from Atlas to Local Docker Mongo!");
    await atlasConn.close();
    await localConn.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err.message);
    process.exit(1);
  }
}

copyData();
