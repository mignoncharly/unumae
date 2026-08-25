import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Shrinking a photograph before it is uploaded.
 *
 * A modern phone camera produces something between 3 and 12 MB. On the
 * connections a lot of the world actually has, that is the difference between
 * a portrait being submitted and a portrait being abandoned halfway — and the
 * app displays it at roughly 400pt wide, so the extra pixels buy nothing.
 *
 * 1600px on the long edge is comfortably more than any screen needs, and
 * leaves room for the Archive to show it larger later.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
}

export async function prepareForUpload(
  uri: string,
  width: number,
  height: number
): Promise<PreparedImage> {
  const longestEdge = Math.max(width, height);

  try {
    const context = ImageManipulator.ImageManipulator.manipulate(uri);
    if (longestEdge > MAX_EDGE) {
      const scale = MAX_EDGE / longestEdge;
      context.resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      });
    }

    const image = await context.renderAsync();
    const result = await image.saveAsync({
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    // Upload registration accepts decoded JPEG only. Falling back to an
    // arbitrary camera file would bypass extension/MIME consistency.
    throw new Error('portrait_image_decode_failed', { cause: error });
  }
}

/** Exposed for the test, and so the numbers are stated once. */
export const IMAGE_LIMITS = { maxEdge: MAX_EDGE, quality: JPEG_QUALITY };
