const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../../Frontend/my-react-app/src/pages/NewArrivals.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Featured product card
content = content.replace(
  /<div className="relative rounded-\[32px\] overflow-hidden border border-white\/10 glass-morphism p-6 md:p-10 lg:p-12 shadow-2xl flex flex-col lg:flex-row items-center gap-12 group">/,
  `<div onClick={() => navigate(\`/products/\${featuredProduct.productId}\`)} className="cursor-pointer relative rounded-[32px] overflow-hidden border border-white/10 glass-morphism p-6 md:p-10 lg:p-12 shadow-2xl flex flex-col lg:flex-row items-center gap-12 group">`
);

// 2. Just Dropped grid card
content = content.replace(
  /className="flex-shrink-0 w-80 glass-morphism rounded-3xl p-5 border border-white\/10 hover:border-cyan-500\/20 transition-all duration-300 flex flex-col justify-between h-\[380px\] group"/,
  `onClick={() => navigate(\`/products/\${item.productId}\`)} className="cursor-pointer flex-shrink-0 w-80 glass-morphism rounded-3xl p-5 border border-white/10 hover:border-cyan-500/20 transition-all duration-300 flex flex-col justify-between h-[380px] group"`
);

// 3. AI Recommendations card
content = content.replace(
  /className="glass-morphism rounded-3xl p-6 border border-white\/10 hover:border-blue-500\/30 transition-all duration-300 relative group flex flex-col md:flex-row gap-6 items-center"/,
  `onClick={() => navigate(\`/products/\${item.productId}\`)} className="cursor-pointer glass-morphism rounded-3xl p-6 border border-white/10 hover:border-blue-500/30 transition-all duration-300 relative group flex flex-col md:flex-row gap-6 items-center"`
);

// 4. Trending drops card
content = content.replace(
  /className="glass-morphism rounded-3xl p-5 border border-white\/10 hover:border-yellow-500\/20 transition-all duration-300 flex flex-col justify-between h-\[420px\] group relative overflow-hidden"/,
  `onClick={() => navigate(\`/products/\${item.productId}\`)} className="cursor-pointer glass-morphism rounded-3xl p-5 border border-white/10 hover:border-yellow-500/20 transition-all duration-300 flex flex-col justify-between h-[420px] group relative overflow-hidden"`
);

// 5. Sorted arrivals grid card
content = content.replace(
  /className="glass-morphism rounded-3xl p-5 border border-white\/10 hover:border-blue-500\/30 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-\[460px\] hover:shadow-\[0_10px_25px_rgba\(5,130,202,0\.1\)\]"/,
  `onClick={() => navigate(\`/products/\${item.productId}\`)} className="cursor-pointer glass-morphism rounded-3xl p-5 border border-white/10 hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-[460px] hover:shadow-[0_10px_25px_rgba(5,130,202,0.1)]"`
);


// Now stop propagation on all buttons
// handleAddToCart(item) -> handleAddToCart(item, e)
content = content.replace(
  /const handleAddToCart = async \(item\) => \{/g,
  `const handleAddToCart = async (item, e) => {\n    if (e) e.stopPropagation();`
);
content = content.replace(
  /onClick={\(\) => handleAddToCart\(featuredProduct\)}/g,
  `onClick={(e) => handleAddToCart(featuredProduct, e)}`
);
content = content.replace(
  /onClick={\(\) => handleAddToCart\(item\)}/g,
  `onClick={(e) => handleAddToCart(item, e)}`
);

// toggleWishlist
content = content.replace(
  /const toggleWishlist = \(id, name\) => \{/g,
  `const toggleWishlist = (id, name, e) => {\n    if (e) e.stopPropagation();`
);
content = content.replace(
  /onClick={\(\) => toggleWishlist\(featuredProduct\.id, featuredProduct\.name\)}/g,
  `onClick={(e) => toggleWishlist(featuredProduct.id, featuredProduct.name, e)}`
);
content = content.replace(
  /onClick={\(\) => toggleWishlist\(item\.id, item\.name\)}/g,
  `onClick={(e) => toggleWishlist(item.id, item.name, e)}`
);

// quick view
content = content.replace(
  /onClick={\(\) => setQuickViewItem\(item\)}/g,
  `onClick={(e) => { e.stopPropagation(); setQuickViewItem(item); }}`
);

// add buy now handler
if (!content.includes('const handleBuyNow')) {
  const buyNowStr = `
  const handleBuyNow = async (item, e) => {
    if (e) e.stopPropagation();
    if (!token && item.isReal) {
      navigate("/login");
      return;
    }
    setAddingId(item.id);
    try {
      if (item.isReal) {
        await addItem(item.id, 1);
        navigate("/cart");
      }
    } catch (err) {
      showToast(err.message || "Failed to buy now", false);
    } finally {
      setAddingId(null);
    }
  };
`;
  content = content.replace('const handleAddToCart = async (item, e) => {', buyNowStr + '\n  const handleAddToCart = async (item, e) => {');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed New Arrivals UI');
