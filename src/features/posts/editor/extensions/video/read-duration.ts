/**
 * How long a video file is, in whole seconds, as the browser reads it from the
 * file's header, or `null` when it cannot be read within `timeoutMs`. The
 * Worker never fetches the file, so the editor is the only place its length
 * can be learned; a file that is slow or refuses to load must not hold up
 * the Admin, who can still embed it without a length.
 */
export function readVideoDuration(
  src: string,
  timeoutMs = 4000,
): Promise<number | null> {
  return new Promise((resolve) => {
    // Never attached to the page, so nothing plays or shows.
    const video = document.createElement("video");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (seconds: number | null) => {
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      // Stops the download that `preload` started.
      video.removeAttribute("src");
      video.load();
      resolve(seconds);
    };
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      const seconds = Math.round(video.duration);
      finish(Number.isFinite(video.duration) && seconds >= 1 ? seconds : null);
    };
    video.onerror = () => finish(null);
    timer = setTimeout(() => finish(null), timeoutMs);
    video.src = src;
  });
}
