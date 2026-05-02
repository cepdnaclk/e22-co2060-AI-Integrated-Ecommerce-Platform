const Product = require('../models/Product');
const Offer = require('../models/Offer');

exports.getMonthlyNewsletterData = async (req, res) => {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Fetch products added in the last 30 days
        const newProducts = await Product.find({
            createdAt: { $gte: oneMonthAgo }
        }).limit(5);

        // Fetch active offers
        const activeOffers = await Offer.find({
            expiryDate: { $gt: new Date() }
        }).limit(3);

        res.status(200).json({
            success: true,
            data: { newProducts, activeOffers }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};