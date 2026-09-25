const fs = require('fs');

const rawData = fs.readFileSync('scratch/atlas_audit_results.json', 'utf8');
const products = JSON.parse(rawData);

console.log(`Loaded ${products.length} products from Atlas audit JSON.`);

const targetKeywords = [
  'ASUS ROG Zephyrus G14',
  'ASUS ROG Zephyrus G16',
  'MacBook Air M3',
  'Samsung Galaxy S25 Ultra',
  'Razer BlackWidow V4 Keyboard'
];

let report = [];
report.push("=================================================================");
report.push(" READ-ONLY MONGODB ATLAS PRODUCT PRICE DATA QUALITY AUDIT REPORT");
report.push(" Database: MongoDB Atlas (ecommerce.products & selleroffers)");
report.push(" Total Products: " + products.length);
report.push("=================================================================\n");

// 1. Specific Target Items
report.push("-----------------------------------------------------------------");
report.push(" SECTION 1: USER-SPECIFIED TARGET PRODUCT AUDIT");
report.push("-----------------------------------------------------------------\n");

for (const kw of targetKeywords) {
  const matches = products.filter(p => p.title.toLowerCase().includes(kw.toLowerCase()));
  report.push(`>>> TARGET KEYWORD: "${kw}" (${matches.length} matching documents found)`);
  for (const p of matches) {
    let classification = "NORMAL";
    let reasons = [];

    const minP = p.effectiveMinPrice;

    if (p.title.includes("G14") && minP !== null && minP < 200000) {
      classification = "POSSIBLE DATA ANOMALY";
      reasons.push(`Unusually low price for high-end gaming laptop (LKR ${minP.toLocaleString()})`);
    }
    if (p.title.includes("MacBook Air M3") && minP !== null && minP < 200000) {
      classification = "POSSIBLE DATA ANOMALY";
      reasons.push(`Unusually low price for modern Apple MacBook Air laptop (LKR ${minP.toLocaleString()})`);
    }

    report.push(`  ID: ${p._id}`);
    report.push(`  Title: ${p.title}`);
    report.push(`  Brand: ${p.brand} | Category: ${p.category}`);
    report.push(`  Document minPrice: ${p.docMinPrice !== null ? 'LKR ' + p.docMinPrice.toLocaleString() : 'N/A'}`);
    report.push(`  Document maxPrice: ${p.docMaxPrice !== null ? 'LKR ' + p.docMaxPrice.toLocaleString() : 'N/A'}`);
    report.push(`  Effective Min Price: ${minP !== null ? 'LKR ' + minP.toLocaleString() : 'N/A'}`);
    report.push(`  Effective Max Price: ${p.effectiveMaxPrice !== null ? 'LKR ' + p.effectiveMaxPrice.toLocaleString() : 'N/A'}`);
    report.push(`  Total Stock: ${p.effectiveStock}`);
    report.push(`  Active Seller Offers: ${p.offersFormatted || 'None'}`);
    report.push(`  CLASSIFICATION: [ ${classification} ]`);
    if (reasons.length > 0) report.push(`  ANOMALY REASONS: ${reasons.join('; ')}`);
    report.push('');
  }
}

// 2. High-Value Electronics / Appliances / Laptops / Phones with Unusually Low Prices (< LKR 100,000)
report.push("-----------------------------------------------------------------");
report.push(" SECTION 2: HIGH-VALUE ELECTRONICS / APPLIANCES WITH UNUSUALLY LOW PRICES (< LKR 100,000)");
report.push("-----------------------------------------------------------------\n");

for (const p of products) {
  const isHighValue = /\b(laptop|macbook|notebook|zephyrus|xps|refrigerator|washer|dishwasher|tv|camera|drone)\b/i.test(p.title);
  
  if (isHighValue && p.effectiveMinPrice !== null && p.effectiveMinPrice < 100000) {
    let classification = "POSSIBLE DATA ANOMALY";
    let reason = `Flagship/High-value hardware priced unusually low at LKR ${p.effectiveMinPrice.toLocaleString()}`;

    report.push(`  ID: ${p._id}`);
    report.push(`  Title: ${p.title}`);
    report.push(`  Brand: ${p.brand} | Category: ${p.category}`);
    report.push(`  Min Price: LKR ${p.effectiveMinPrice.toLocaleString()} | Max Price: ${p.effectiveMaxPrice ? 'LKR ' + p.effectiveMaxPrice.toLocaleString() : 'N/A'}`);
    report.push(`  Total Stock: ${p.effectiveStock}`);
    report.push(`  Seller Offers: ${p.offersFormatted || 'None'}`);
    report.push(`  CLASSIFICATION: [ ${classification} ]`);
    report.push(`  REASON: ${reason}`);
    report.push('--------------------------------------------------');
  }
}

// 3. Complete List of All Products Under LKR 100,000
report.push("\n-----------------------------------------------------------------");
report.push(" SECTION 3: ALL PRODUCTS WITH PRICE BELOW LKR 100,000");
report.push("-----------------------------------------------------------------\n");

const under100k = products.filter(p => p.effectiveMinPrice !== null && p.effectiveMinPrice < 100000);
report.push(`Total products under LKR 100,000: ${under100k.length}\n`);

for (const p of under100k) {
  let classification = "NORMAL";
  let reasons = [];

  const isHighValue = /\b(laptop|macbook|notebook|zephyrus|xps|refrigerator|washer|dishwasher|tv|camera|drone)\b/i.test(p.title);
  if (isHighValue) {
    classification = "POSSIBLE DATA ANOMALY";
    reasons.push(`Suspiciously low price (LKR ${p.effectiveMinPrice.toLocaleString()}) for high-end hardware`);
  }

  report.push(`  ID: ${p._id}`);
  report.push(`  Title: ${p.title}`);
  report.push(`  Brand: ${p.brand} | Category: ${p.category}`);
  report.push(`  Min Price: LKR ${p.effectiveMinPrice.toLocaleString()}`);
  report.push(`  Total Stock: ${p.effectiveStock}`);
  report.push(`  Active Seller Offers: ${p.offersFormatted || 'None'}`);
  report.push(`  CLASSIFICATION: [ ${classification} ]`);
  if (reasons.length > 0) report.push(`  REASONS: ${reasons.join('; ')}`);
  report.push('--------------------------------------------------');
}

// 4. Products with Missing / Zero / Null Price
report.push("\n-----------------------------------------------------------------");
report.push(" SECTION 4: PRODUCTS WITHOUT ACTIVE SELLER OFFERS OR DOCUMENT PRICES");
report.push("-----------------------------------------------------------------\n");

const noPrices = products.filter(p => p.effectiveMinPrice === null || p.effectiveMinPrice <= 0);
report.push(`Total products with missing/zero price: ${noPrices.length}\n`);

for (const p of noPrices) {
  report.push(`  ID: ${p._id}`);
  report.push(`  Title: ${p.title}`);
  report.push(`  Brand: ${p.brand} | Category: ${p.category}`);
  report.push(`  Active Offers: ${p.offersFormatted || 'No active seller offers'}`);
  report.push(`  CLASSIFICATION: [ POSSIBLE DATA ANOMALY ]`);
  report.push(`  REASON: Product has no active price or seller offers in Atlas database`);
  report.push('--------------------------------------------------');
}

fs.writeFileSync('scratch/final_atlas_audit_report.txt', report.join('\n'));
console.log("Analysis completed. Written to scratch/final_atlas_audit_report.txt");
