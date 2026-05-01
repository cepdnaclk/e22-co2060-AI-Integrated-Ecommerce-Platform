import mongoose from "mongoose";

/**
 * ======================================================
 * PRODUCT VARIANT MODEL
 * ======================================================
 * A variant is a specific configuration of a Product.
 * Example: iPhone 17 (Product) → Black 256GB (Variant)
 *
 * Architecture:
 *   Product → ProductVariant → SellerOffer
 *
 * The `searchText` field is a denormalised string used
 * for full-text (inverted-index) search.
 * ======================================================
 */
const productVariantSchema = new mongoose.Schema(
    {
        /* 🔗 Parent product */
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },

        /* 🏷️ Display name for this variant */
        variantName: {
            type: String,
            required: true,    // e.g. "Black 256GB"
        },

        /* 🎨 Common variant attributes */
        color: { type: String, default: "" },     // e.g. "Black"
        storage: { type: String, default: "" },   // e.g. "256GB"
        size: { type: String, default: "" },      // e.g. "XL", "15.6\""

        /* 🔧 Flexible extra attributes (brand-specific) */
        attributes: {
            type: Map,
            of: String,
            default: {},
        },

        /* 🖼️ Variant-specific image (overrides product image) */
        image: { type: String, default: "" },

        /**
         * 🔍 INVERTED-INDEX SEARCH FIELD
         * Denormalised string combining all searchable terms.
         * Built automatically by the pre-save hook.
         * MongoDB text index is placed on this field so queries
         * like "black iphone 17 256gb" resolve immediately.
         */
        searchText: {
            type: String,
            default: "",
        },

        /* ✅ Active flag */
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

/* ──────────────────────────────────────────────────────
 * PRE-SAVE HOOK – keep searchText in sync automatically
 * ────────────────────────────────────────────────────── */
productVariantSchema.pre("save", function (next) {
    const parts = [
        this.variantName,
        this.color,
        this.storage,
        this.size,
    ];

    // Spread any extra attributes into the search text
    if (this.attributes && this.attributes.size > 0) {
        for (const [, v] of this.attributes) parts.push(v);
    }

    this.searchText = parts.filter(Boolean).join(" ").toLowerCase();
    next();
});

/* ──────────────────────────────────────────────────────
 * TEXT INDEX – powers Layer 1 (inverted index) search
 * ────────────────────────────────────────────────────── */
productVariantSchema.index({ searchText: "text" }, { weights: { searchText: 10 } });
productVariantSchema.index({ productId: 1, isActive: 1 });

const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);
export default ProductVariant;
