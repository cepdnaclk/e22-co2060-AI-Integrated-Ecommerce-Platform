import Order from "../models/order.js";
import Product from "../models/products.js";

/**
 * GET /api/sellers/dashboard/stats
 * Aggregates seller orders and products to compute dashboard KPIs and chart data.
 */
export async function getSellerDashboardStats(req, res) {
    try {
        const sellerId = req.sellerId; // Extracted safely from auth middleware -> getSellerId middleware

        // 1. Basic counts (Total Orders & Total Products)
        const totalOrders = await Order.countDocuments({ sellerId });
        const totalProducts = await Product.countDocuments({ sellerId });

        // 2. Aggregate Total Revenue & Monthly Breakdowns
        const revenueData = await Order.aggregate([
            { $match: { sellerId } },
            {
                $group: {
                    _id: { $month: "$createdAt" }, // Group by exactly the month
                    monthlyRevenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { "_id": 1 } },
        ]);

        // Map month indices (1-12) to short month strings
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let totalRevenue = 0;
        const monthlyProgress = revenueData.map(item => {
            totalRevenue += item.monthlyRevenue;
            return {
                name: monthNames[item._id - 1] || "Unknown",
                revenue: item.monthlyRevenue,
            };
        });

        // If no sales yet, fill with placeholder mock data just so the chart looks nice
        if (monthlyProgress.length === 0) {
            monthlyProgress.push({ name: "Jan", revenue: 0 }, { name: "Feb", revenue: 0 }, { name: "Mar", revenue: 0 });
        }

        // 3. Get 5 most recent orders for the table
        const recentOrders = await Order.find({ sellerId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("userId", "firstName lastName email")
            .select("totalAmount status createdAt");

        return res.status(200).json({
            metrics: {
                totalRevenue,
                totalOrders,
                totalProducts,
                revenueGrowth: 0, // Placeholder for future logic
            },
            monthlyProgress,
            recentOrders,
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Server error fetching dashboard stats" });
    }
}
