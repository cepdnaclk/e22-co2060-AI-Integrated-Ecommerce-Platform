import test from "node:test";
import assert from "node:assert/strict";
import { createFirebaseLogin } from "../controllers/firebaseAuthController.js";

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("login returns 401 when Authorization header is missing", async () => {
  const login = createFirebaseLogin({
    getAdminClient: async () => ({ auth: () => ({ verifyIdToken: async () => ({}) }) }),
    userRepo: { findOne: async () => null, create: async () => null },
    signJwt: () => "app.jwt"
  });

  const req = { headers: {} };
  const res = makeRes();
  await login(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Missing Firebase token");
});

test("login creates user and returns app JWT for valid Firebase token", async () => {
  const fakeUser = {
    _id: "u1",
    email: "new@example.com",
    role: "customer",
    image: "pic.png",
    isBlocked: false,
    token: null,
    async save() {
      return this;
    }
  };

  const login = createFirebaseLogin({
    getAdminClient: async () => ({
      auth: () => ({
        verifyIdToken: async () => ({
          email: "new@example.com",
          name: "New User",
          picture: "pic.png"
        })
      })
    }),
    userRepo: {
      findOne: async () => null,
      create: async () => fakeUser
    },
    signJwt: () => "app.jwt.token"
  });

  const req = { headers: { authorization: "Bearer firebase-id-token" } };
  const res = makeRes();
  await login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Login successful");
  assert.equal(res.body.token, "app.jwt.token");
  assert.equal(res.body.user.email, "new@example.com");
  assert.equal(fakeUser.token, "app.jwt.token");
});

test("login returns 403 when user is blocked", async () => {
  const login = createFirebaseLogin({
    getAdminClient: async () => ({
      auth: () => ({
        verifyIdToken: async () => ({
          email: "blocked@example.com",
          name: "Blocked User",
          picture: ""
        })
      })
    }),
    userRepo: {
      findOne: async () => ({
        _id: "u2",
        email: "blocked@example.com",
        role: "customer",
        image: "",
        isBlocked: true,
        async save() {
          return this;
        }
      }),
      create: async () => {
        throw new Error("should not create");
      }
    },
    signJwt: () => "ignored"
  });

  const req = { headers: { authorization: "Bearer firebase-id-token" } };
  const res = makeRes();
  await login(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Account blocked");
});

test("login returns 401 when Firebase token verification fails", async () => {
  const login = createFirebaseLogin({
    getAdminClient: async () => ({
      auth: () => ({
        verifyIdToken: async () => {
          throw new Error("Invalid Firebase token");
        }
      })
    }),
    userRepo: { findOne: async () => null, create: async () => null },
    signJwt: () => "ignored"
  });

  const req = { headers: { authorization: "Bearer invalid-token" } };
  const res = makeRes();
  await login(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid Firebase token");
});
