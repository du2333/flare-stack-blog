export function getPostPublisher(env: Env, postId: number) {
  return env.POST_PUBLISHER.get(
    env.POST_PUBLISHER.idFromName(`post:${postId}`),
  );
}
