/**
 * PUT a file straight to object storage with a presigned URL.
 *
 * `XMLHttpRequest` rather than `fetch` purely for `upload.onprogress` — `fetch`
 * still cannot report upload progress, and a 90-minute recording without a
 * progress bar looks indistinguishable from a hang.
 *
 * `contentType` must be exactly what the URL was signed for, or storage rejects
 * the signature.
 */
export function uploadToStorage(
  url: string,
  contentType: string,
  blob: Blob,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${request.status})`));
    request.onerror = () => reject(new Error("Upload failed. Check your connection."));

    request.send(blob);
  });
}
