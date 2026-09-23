const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

const workerEnvPath = path.resolve(__dirname, "..", "..", ".env");
const backendEnvPath = path.resolve(__dirname, "..", "..", "..", "backend", ".env");

dotenv.config({ path: workerEnvPath });
dotenv.config({ path: backendEnvPath, override: false });

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(32)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

module.exports = parsed.data;
