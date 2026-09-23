const { Queue } = require("bullmq");
const { connection } = require("../config/redis");

const postQueue = new Queue("scheduled-posts", { connection });

async function enqueuePost(post) {
  const delay = Math.max(new Date(post.scheduledAt).getTime() - Date.now(), 0);
  await postQueue.add(
    "publish-post",
    { postId: post.id },
    {
      delay,
      attempts: 3,
      backoff: { type: "exponential", delay: 30000 },
      removeOnComplete: 1000,
      removeOnFail: false
    }
  );
}

module.exports = { postQueue, enqueuePost };
