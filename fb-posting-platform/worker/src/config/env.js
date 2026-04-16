const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),
  FB_APP_ID: z.string().min(1),
  FB_APP_SECRET: z.string().min(1)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join("\n"));
}

module.exports = parsed.data;
