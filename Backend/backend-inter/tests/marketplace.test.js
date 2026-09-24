import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CommissionPolicy from "../models/commissionPolicy.js";
import Order from "../models/order.js";
import Cart from "../models/cart.js";
import User from "../models/user.js";
import Seller from "../models/seller.js";
import SellerOffer from "../models/sellerOffer.js";
import Product from "../models/products.js";
import { createOrder } from "../controllers/orderController.js";
import { updateCommissionPolicy } from "../controllers/commissionController.js";

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

test("Commission policy validation & admin update", async () => {
  const req = {
    user: { id: new mongoose.Types.ObjectId() },
    body: { rate: 10, name: "Default 10" }
  };
  const res = {
    status: (code) => {
      assert.equal(code, 200);
      return res;
    },
    json: (data) => {
      assert.equal(data.success, true);
      assert.equal(data.policy.rate, 10);
    }
  };

  await updateCommissionPolicy(req, res);

  const policies = await CommissionPolicy.find({});
  assert.equal(policies.length, 1);
  assert.equal(policies[0].isActive, true);
});

test("Order creation commission calculation - 10% rate, excludes delivery", async () => {
  // Setup user, seller, cart
  const userId = new mongoose.Types.ObjectId();
  const sellerId = new mongoose.Types.ObjectId();
  
  await CommissionPolicy.create({ rate: 10, isActive: true, name: "Test 10" });

  const product = await Product.create({ productName: "Phone", brand: "Apple", category: new mongoose.Types.ObjectId(), subcategory: new mongoose.Types.ObjectId() });
  const offer = await SellerOffer.create({ productId: product._id, sellerId, sellerName: "Test Seller", price: 10000, stock: 10 });
  
  await Cart.create({
    userId,
    items: [{ productId: product._id, sellerOfferId: offer._id, sellerId, price: 10000, quantity: 1 }]
  });

  const req = {
    user: { id: userId },
    body: {
      shippingAddress: { 
        lat: 0, 
        lng: 0,
        postalCode: "10000",
        city: "Colombo",
        street: "Main St",
        phone: "0771234567",
        fullName: "Test User"
      }
    }
  };

  let createdOrders = [];
  const res = {
    status: (code) => {
      assert.equal(code, 201);
      return res;
    },
    json: (data) => {
      createdOrders = data.orders;
    }
  };

  await createOrder(req, res);
  assert.equal(createdOrders.length, 1);

  const order = createdOrders[0];
  assert.equal(order.productTotal, 10000);
  assert.equal(order.commissionRate, 10);
  assert.equal(order.commissionAmount, 1000);
  assert.equal(order.sellerPayableAmount, 9000);
  // Delivery charge should not be in commission
  assert.ok(order.commissionPolicyId);
});

test("Historical commission policy remains unchanged", async () => {
  const userId = new mongoose.Types.ObjectId();
  const sellerId = new mongoose.Types.ObjectId();
  
  const policy1 = await CommissionPolicy.create({ rate: 5, isActive: true, name: "Test 5" });

  const product = await Product.create({ productName: "Phone", brand: "Apple", category: new mongoose.Types.ObjectId(), subcategory: new mongoose.Types.ObjectId() });
  const offer = await SellerOffer.create({ productId: product._id, sellerId, sellerName: "Test Seller", price: 1000, stock: 10 });
  
  await Cart.create({
    userId,
    items: [{ productId: product._id, sellerOfferId: offer._id, sellerId, price: 1000, quantity: 1 }]
  });

  const req = { 
    user: { id: userId }, 
    body: {
      shippingAddress: {
        lat: 0, lng: 0, postalCode: "10000", city: "Colombo", street: "Main St", phone: "0771234567", fullName: "Test User"
      }
    } 
  };
  let createdOrders = [];
  const res = {
    status: () => res,
    json: (data) => { createdOrders = data.orders; }
  };

  await createOrder(req, res);
  const oldOrder = await Order.findById(createdOrders[0]._id);
  assert.equal(oldOrder.commissionRate, 5);

  // Change policy to 10
  await updateCommissionPolicy({ user: { id: userId }, body: { rate: 10 } }, { status: () => ({ json: () => {} }) });
  
  // Old order should still be 5
  const oldOrderCheck = await Order.findById(createdOrders[0]._id);
  assert.equal(oldOrderCheck.commissionRate, 5);
});
