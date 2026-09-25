const fs = require('fs');

const raw = fs.readFileSync('scratch/trace_results.json', 'utf8');
const data = JSON.parse(raw);

console.log("=== SECTION 1: SUSPICIOUS PRICE PRODUCTS ===");
for (const item of data.section1Data) {
  console.log(`\n-------------------------------------------------------------`);
  console.log(`Keyword: ${item.targetKeyword}`);
  console.log(`Product ID: ${item.product._id}`);
  console.log(`Product Title: ${item.product.productName}`);
  console.log(`Brand: ${item.product.brand} | Category: ${item.product.category}`);
  console.log(`Created: ${item.product.createdAt} | Updated: ${item.product.updatedAt}`);
  console.log(`minPrice: ${item.product.minPrice} | maxPrice: ${item.product.maxPrice} | totalStock: ${item.product.totalStock}`);
  console.log(`Offers Count: ${item.offers.length}`);
  for (const o of item.offers) {
    console.log(`   - Offer ID: ${o.offerId}`);
    console.log(`     Price: LKR ${o.price} | OrigPrice: ${o.originalPrice} | Discount%: ${o.discountPercentage}`);
    console.log(`     Stock: ${o.stock} | isActive: ${o.isActive} | Status: ${o.status}`);
    console.log(`     Seller ID: ${o.sellerId} | Seller Name: ${o.sellerName}`);
    console.log(`     Seller Email: ${o.sellerEmail}`);
    console.log(`     Created: ${o.createdAt} | Updated: ${o.updatedAt}`);
  }
}

console.log("\n\n=== SECTION 2: PRODUCTS WITHOUT ACTIVE OFFERS ===");
for (const item of data.section2Data) {
  console.log(`\n-------------------------------------------------------------`);
  console.log(`Product ID: ${item._id}`);
  console.log(`Title: ${item.productName}`);
  console.log(`Brand: ${item.brand} | Category: ${item.category}`);
  console.log(`Created: ${item.createdAt} | Updated: ${item.updatedAt}`);
  console.log(`Total Offers in DB (active + inactive): ${item.totalOffersCount}`);
  if (item.allOffers.length > 0) {
    for (const o of item.allOffers) {
      console.log(`   - Offer ID: ${o._id}`);
      console.log(`     Price: ${o.price} | Stock: ${o.stock} | isActive: ${o.isActive} | status: ${o.status}`);
      console.log(`     Seller ID: ${o.sellerId} | Seller Name: ${o.sellerName}`);
    }
  } else {
    console.log(`   - No offers exist in selleroffers collection at all.`);
  }
}

console.log("\n\n=== SECTION 3: SAMSUNG GALAXY S25 ULTRA DUPLICATES ===");
for (const item of data.section3Data) {
  console.log(`\n-------------------------------------------------------------`);
  console.log(`Product ID: ${item._id}`);
  console.log(`Title: ${item.productName}`);
  console.log(`Brand: ${item.brand} | Category: ${item.category}`);
  console.log(`Description: ${item.description.substring(0, 80)}...`);
  console.log(`Created: ${item.createdAt} | Updated: ${item.updatedAt}`);
  console.log(`Total Offers: ${item.offersCount} | Active Offers: ${item.activeOffersCount}`);
  for (const o of item.offers) {
    console.log(`   - Offer ID: ${o._id} | Price: LKR ${o.price} | Stock: ${o.stock} | Seller: ${o.sellerName} | Active: ${o.isActive}`);
  }
}
