import { Queue } from "bullmq";
import redisConnection from "./redisConnection.js";

export const facebookPostQueue = new Queue("facebook-scheduled-posts", {
  connection: redisConnection
});

export async function enqueueFacebookPost(post) {
  const delay = Math.max(new Date(post.scheduledAt).getTime() - Date.now(), 0);
  await facebookPostQueue.add(
    "publish-facebook-post",
    { postId: post._id.toString() },
    {
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 30000
      },
      removeOnComplete: 1000,
      removeOnFail: false
    }
  );
}
