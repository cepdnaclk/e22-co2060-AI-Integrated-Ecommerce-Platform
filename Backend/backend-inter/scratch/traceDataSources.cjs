const mongoose = require('mongoose');
const fs = require('fs');

const ATLAS_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

async function traceData() {
  console.log("Connecting to MongoDB Atlas for deep tracing...");
  const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const db = conn.db;

  const productsColl = db.collection('products');
  const offersColl = db.collection('selleroffers');
  const sellersColl = db.collection('sellers');
  const usersColl = db.collection('users');

  const allProducts = await productsColl.find({}).toArray();
  const allOffers = await offersColl.find({}).toArray();
  const allSellers = await sellersColl.find({}).toArray();
  const allUsers = await usersColl.find({}).toArray();

  console.log(`Loaded: ${allProducts.length} Products, ${allOffers.length} Seller Offers, ${allSellers.length} Sellers, ${allUsers.length} Users.`);

  const sellersMap = {};
  for (const s of allSellers) sellersMap[s._id.toString()] = s;

  const usersMap = {};
  for (const u of allUsers) usersMap[u._id.toString()] = u;

  // 1. The 7 Suspicious Price Products
  const target7Titles = [
    'Dell XPS 13 Laptop',
    'Apple MacBook Air M3',
    'Canon EOS R5 Camera',
    'ASUS ROG Zephyrus G14',
    'LG InstaView Refrigerator',
    'Samsung EcoBubble Washer',
    'Bosch Series 6 Dishwasher'
  ];

  const section1Data = [];

  for (const tKw of target7Titles) {
    const matches = allProducts.filter(p => {
      const pName = p.productName || p.title || p.name || '';
      return pName.toLowerCase().includes(tKw.toLowerCase());
    });

    for (const p of matches) {
      const pId = p._id.toString();
      const pOffers = allOffers.filter(o => {
        const oPid = o.productId ? o.productId.toString() : (o.product ? o.product.toString() : null);
        return oPid === pId;
      });

      const offersDetailed = pOffers.map(o => {
        const sId = o.sellerId ? o.sellerId.toString() : null;
        const sellerDoc = sId ? sellersMap[sId] : null;
        const uId = sellerDoc && sellerDoc.userId ? sellerDoc.userId.toString() : null;
        const userDoc = uId ? usersMap[uId] : null;

        return {
          offerId: o._id.toString(),
          price: o.price,
          originalPrice: o.originalPrice || o.price,
          discountPercentage: o.discountPercentage || 0,
          stock: o.stock,
          isActive: o.isActive,
          status: o.status,
          sellerId: sId,
          sellerName: o.sellerName || (sellerDoc ? sellerDoc.storeName : 'Unknown'),
          sellerEmail: sellerDoc ? sellerDoc.email : (userDoc ? userDoc.email : 'N/A'),
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          rawOffer: o
        };
      });

      section1Data.push({
        targetKeyword: tKw,
        product: {
          _id: pId,
          productName: p.productName || p.title || p.name,
          brand: p.brand,
          category: p.category,
          description: p.description,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          totalStock: p.totalStock,
          rawProduct: p
        },
        offers: offersDetailed
      });
    }
  }

  // 2. The 4 Products with No Active Offers
  const target4Titles = [
    'Apple MacBook',
    'Jedel Wireless Mouse',
    'Apple AirPods Pro 2nd Gen',
    'Samsung Galaxy S25 Ultra'
  ];

  const section2Data = [];

  for (const p of allProducts) {
    const pName = p.productName || p.title || p.name || '';
    const pId = p._id.toString();

    const pOffers = allOffers.filter(o => {
      const oPid = o.productId ? o.productId.toString() : (o.product ? o.product.toString() : null);
      return oPid === pId;
    });

    const activeOffers = pOffers.filter(o => o.isActive !== false && o.status !== 'inactive');

    // Check if this product matches any of the 4 or has 0 active offers
    const matchesTarget4 = target4Titles.some(kw => pName.toLowerCase().includes(kw.toLowerCase()));
    
    if (matchesTarget4 && activeOffers.length === 0) {
      section2Data.push({
        _id: pId,
        productName: pName,
        brand: p.brand || 'N/A',
        category: p.category || 'N/A',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        totalOffersCount: pOffers.length,
        allOffers: pOffers,
        rawProduct: p
      });
    }
  }

  // 3. Samsung Galaxy S25 Ultra Duplicates
  const s25Matches = allProducts.filter(p => {
    const pName = p.productName || p.title || p.name || '';
    return pName.toLowerCase().includes('samsung galaxy s25 ultra');
  });

  const section3Data = [];

  for (const p of s25Matches) {
    const pId = p._id.toString();
    const pOffers = allOffers.filter(o => {
      const oPid = o.productId ? o.productId.toString() : (o.product ? o.product.toString() : null);
      return oPid === pId;
    });

    const activeOffers = pOffers.filter(o => o.isActive !== false);

    section3Data.push({
      _id: pId,
      productName: p.productName || p.title || p.name,
      brand: p.brand || 'N/A',
      category: p.category || 'N/A',
      description: p.description || 'N/A',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      offersCount: pOffers.length,
      activeOffersCount: activeOffers.length,
      offers: pOffers.map(o => ({
        _id: o._id.toString(),
        sellerId: o.sellerId ? o.sellerId.toString() : 'N/A',
        sellerName: o.sellerName || 'N/A',
        price: o.price,
        stock: o.stock,
        isActive: o.isActive,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
      })),
      rawProduct: p
    });
  }

  const fullReportData = {
    section1Data,
    section2Data,
    section3Data
  };

  fs.writeFileSync('scratch/trace_results.json', JSON.stringify(fullReportData, null, 2));
  console.log("Trace completed successfully. Written to scratch/trace_results.json");

  await conn.close();
  process.exit(0);
}

traceData();
