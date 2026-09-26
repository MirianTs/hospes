// Face comparison in the browser with @vladmandic/face-api.
// Model weights are served from /models (copied there by scripts/copy-face-models.mjs).
import * as faceapi from '@vladmandic/face-api';

let loading = null;

export function loadModels() {
  if (!loading) {
    loading = (async () => {
      const webgl = await faceapi.tf.setBackend('webgl').catch(() => false);
      if (!webgl) await faceapi.tf.setBackend('cpu');
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      // The first detection compiles the WebGL shaders (several seconds); do it now,
      // while the guest is still taking photos, instead of on the "compare" click.
      const blank = document.createElement('canvas');
      blank.width = 160;
      blank.height = 120;
      await faceapi.detectSingleFace(blank, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks().withFaceDescriptor();
    })().catch((err) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

// Returns the 128-number descriptor of the most confident face, or null.
export async function describeFace(canvas) {
  const result = await faceapi
    .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ? { descriptor: result.descriptor, score: result.detection.score } : null;
}

export function faceDistance(a, b) {
  return faceapi.euclideanDistance(a, b);
}
