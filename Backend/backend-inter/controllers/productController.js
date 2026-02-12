import productModel from "../models/product.js"

export function createProduct(req,res){

    const productData = new productModel({
        price : req.body.price,
        name : req.body.productName,
        sellerName : req.body.sellerName
    })

    productData.save().then(
        ()=>{
            res.json({
                message : "Product activated successfully"
            })
        }
    ).catch(
        ()=>{
            res.json({
                message : "Error creating product"
            })
        }
    )
}

