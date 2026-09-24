import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Order from "../models/order.js";
import { simulateTestPayment } from "../controllers/paymentController.js";

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

test("test payment disabled in production", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalFlag = process.env.ENABLE_TEST_PAYMENTS;
  
  process.env.NODE_ENV = "production";
  process.env.ENABLE_TEST_PAYMENTS = "true";
  
  const req = { body: { orderId: "123" } };
  const res = {
    status: (code) => {
      assert.equal(code, 403);
      return res;
    },
    json: (data) => {
      assert.match(data.message, /disabled/i);
    }
  };
  
  await simulateTestPayment(req, res);
  
  process.env.NODE_ENV = originalEnv;
  process.env.ENABLE_TEST_PAYMENTS = originalFlag;
});

test("test payment success and idempotency", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalFlag = process.env.ENABLE_TEST_PAYMENTS;
  
  process.env.NODE_ENV = "test";
  process.env.ENABLE_TEST_PAYMENTS = "true";
  
  const order = await Order.create({
    orderId: "ORD-TEST-123",
    userId: new mongoose.Types.ObjectId(),
    sellerId: new mongoose.Types.ObjectId(),
    paymentStatus: "pending",
    status: "pending",
    totalAmount: 58114,
    productTotal: 54418,
    deliveryCharge: 3696,
    commissionRate: 10,
    commissionAmount: 5442,
    sellerPayableAmount: 48976,
    items: [],
    shippingAddress: { city: "Colombo", fullName: "Test User", phone: "123", postalCode: "001", street: "1" }
  });
  
  const req = { body: { orderId: order.orderId } };
  let statusCode = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: () => {}
  };
  
  // First Call
  await simulateTestPayment(req, res);
  assert.equal(statusCode, 200);
  
  const updatedOrder = await Order.findById(order._id);
  assert.equal(updatedOrder.paymentStatus, "paid");
  assert.equal(updatedOrder.payhereStatusCode, 2);
  assert.equal(updatedOrder.payhereMethod, "TEST");
  
  // Duplicate payment
  await simulateTestPayment(req, res);
  assert.equal(statusCode, 200); // Should resolve gracefully without making changes or throwing errors.
  
  process.env.NODE_ENV = originalEnv;
  process.env.ENABLE_TEST_PAYMENTS = originalFlag;
});
