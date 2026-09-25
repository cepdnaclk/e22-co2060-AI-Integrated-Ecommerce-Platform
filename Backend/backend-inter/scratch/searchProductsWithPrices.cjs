const fs = require('fs');

const products = JSON.parse(fs.readFileSync('scratch/audit_full_results.json', 'utf8'));

console.log(`Total products: ${products.length}`);

let withDocPrice = 0;
let withOffers = 0;

for (const p of products) {
  const doc = p.rawDoc;
  const hasMin = doc.minPrice !== undefined;
  const hasMax = doc.maxPrice !== undefined;
  const hasPrice = doc.price !== undefined;
  if (hasMin || hasMax || hasPrice) {
    withDocPrice++;
    console.log(`Doc Price found: [${p._id}] ${p.title} -> minPrice: ${doc.minPrice}, maxPrice: ${doc.maxPrice}, price: ${doc.price}`);
  }
  if (p.offersCount > 0) {
    withOffers++;
    console.log(`Offer found: [${p._id}] ${p.title} -> Offers: ${p.offersFormatted}`);
  }
}

console.log(`Products with document price fields: ${withDocPrice}`);
console.log(`Products with seller offers: ${withOffers}`);
