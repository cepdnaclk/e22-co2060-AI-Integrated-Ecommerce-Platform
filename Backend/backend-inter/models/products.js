import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
    {
        price :{
            type : Number,
            required : true

        },

        productName :{
            type : String,
            required : true
        },

        image :{
            type : String,
            default : "/images/default-profile.png"
        },

        isAvailable :{
            type : Boolean,
            required : true,
            default : true
        },

        warranty :{
            type : String,
            required : true,
            default : true
        },

        howManyproductsSold :{
            type : Number,
            required : true,
            default : 0
        },

        sellerName :{
            type : String,
            required : true
        }

    }
)

const productModel = mongoose.model("product",productSchema)

export default productModel