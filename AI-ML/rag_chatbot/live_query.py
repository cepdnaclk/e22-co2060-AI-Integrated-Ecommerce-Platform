from typing import Dict, Any, Optional
import os
from pymongo import MongoClient

def get_mongo_client() -> Optional[MongoClient]:
    uri = os.getenv("MONGO_URI")
    if not uri:
        return None
    try:
        return MongoClient(uri)
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        return None

def query_product_stock(product_name: str) -> Dict[str, Any]:
    client = get_mongo_client()
    if not client:
        return {"error": "MongoDB connection not available."}
    
    db = client.get_database()
    product = db["products"].find_one(
        {"$text": {"$search": product_name}},
        projection={"score": {"$meta": "textScore"}}
    )
    if not product:
        product = db["products"].find_one({"productName": {"$regex": product_name, "$options": "i"}})
        
    if not product:
        return {"result": f"Could not find any product matching '{product_name}'."}

    offers = list(db["selleroffers"].find({"productId": product["_id"]}))
    
    if not offers:
        return {"result": f"Found '{product['productName']}', but no sellers are currently offering it."}

    total_stock = sum(offer.get("stock", 0) for offer in offers)
    active_sellers = [offer["sellerName"] for offer in offers if offer.get("isActive", True) and offer.get("stock", 0) > 0]
    
    return {
        "result": f"The '{product['productName']}' has {total_stock} units in stock total.",
        "details": f"Available from sellers: {', '.join(active_sellers) if active_sellers else 'None'}"
    }

def query_order_status(order_id: str) -> Dict[str, Any]:
    client = get_mongo_client()
    if not client:
        return {"error": "MongoDB connection not available."}
        
    db = client.get_database()
    order = db["orders"].find_one({"orderId": order_id})
    if not order:
        order = db["orders"].find_one({"_id": order_id})
        
    if not order:
        return {"result": f"Could not find order with ID '{order_id}'."}
        
    return {
        "result": f"Order {order_id} is currently '{order.get('status', 'unknown')}'.",
        "details": f"Payment status: {order.get('paymentStatus', 'unknown')}. Total amount: {order.get('totalAmount')} {order.get('currency', 'LKR')}."
    }

def process_live_query(question: str) -> Optional[str]:
    """
    Super basic intent matching to decide if we should do a live query.
    In a real system, you'd use an LLM or classifier for this.
    """
    question_lower = question.lower()
    
    if "stock" in question_lower or "how many" in question_lower or "available" in question_lower:
        # Extract product name naively
        words = question_lower.replace("?", "").split()
        if "of" in words:
            idx = words.index("of")
            product_name = " ".join(words[idx+1:])
            res = query_product_stock(product_name)
            if "error" not in res and "result" in res:
                return f"Live DB Query Result: {res['result']} {res.get('details', '')}"
                
    if "status of order" in question_lower or "order status" in question_lower:
        words = question_lower.replace("?", "").split()
        order_id = words[-1]
        res = query_order_status(order_id)
        if "error" not in res and "result" in res:
            return f"Live DB Query Result: {res['result']} {res.get('details', '')}"

    return None
