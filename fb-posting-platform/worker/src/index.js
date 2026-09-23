const { Worker } = require("bullmq");
const prisma = require("./config/prisma");
const { connection } = require("./config/redis");
const { decrypt } = require("./utils/crypto");
const { publishToFacebook } = require("./services/facebookPublisher");

const worker = new Worker(
  "scheduled-posts",
  async (job) => {
    const post = await prisma.post.findUnique({
      where: { id: job.data.postId },
      include: { page: true }
    });

    if (!post) {
      throw new Error("Post not found");
    }
    if (post.status === "published") {
      return { skipped: true };
    }

    try {
      const response = await publishToFacebook({
        pageId: post.page.pageId,
        pageToken: decrypt(post.page.pageAccessToken),
        content: post.content,
        linkUrl: post.linkUrl || undefined,
        imageUrl: post.imageUrl || undefined
      });

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          graphPostId: response.id || null,
          errorMessage: null
        }
      });
    } catch (error) {
      const attempts = job.attemptsMade + 1;
      if (attempts >= 3) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "failed",
            errorMessage: error.message
          }
        });
      }
      throw error;
    }

    return { ok: true };
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

console.log("Worker started");
