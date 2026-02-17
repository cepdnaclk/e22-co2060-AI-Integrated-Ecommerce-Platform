import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";

export async function searchProductService(keyword) {
  return await productModel.aggregate([
    /* 1️⃣ TEXT SEARCH */
    {
      $match: {
        $text: { $search: keyword }
      }
    },

    /* 2️⃣ TEXT SCORE */
    {
      $addFields: {
        score: { $meta: "textScore" }
      }
    },

    /* 3️⃣ JOIN SELLER OFFERS */
    {
      $lookup: {
        from: "selleroffers",
        localField: "_id",
        foreignField: "productId",
        as: "offers"
      }
    },

    /* 4️⃣ CALCULATE MARKETPLACE DATA */
    {
      $addFields: {
        sellerCount: {
          $size: {
            $filter: {
              input: "$offers",
              as: "offer",
              cond: { $eq: ["$$offer.isActive", true] }
            }
          }
        },
        minPrice: {
          $min: {
            $map: {
              input: {
                $filter: {
                  input: "$offers",
                  as: "offer",
                  cond: { $eq: ["$$offer.isActive", true] }
                }
              },
              as: "o",
              in: "$$o.price"
            }
          }
        }
      }
    },

    /* 5️⃣ CLEAN RESPONSE */
    {
      $project: {
        offers: 0
      }
    },

    /* 6️⃣ SORT BY RELEVANCE */
    {
      $sort: {
        score: -1
      }
    }
  ]);
}
