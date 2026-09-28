import fs from 'fs'
import path from 'path'

const ALBUM_DIR = path.join(process.cwd(), 'public', 'album')
const IMAGE_FILE = /\.(jpe?g|png|webp|avif)$/i

/**
 * The photos in `public/album`, in filename order.
 *
 * Adding a photo to the gallery means dropping the file in that folder — there
 * is no second list to keep in step. The filenames sort into the order the
 * photographer shot them, which is the order the gallery has always shown.
 *
 * This reads the filesystem, so it must only ever run at build time. That holds
 * because the home page renders statically: Next evaluates it during `next build`,
 * where `public/` is present, and bakes the result into the HTML. **If the home
 * page is ever made dynamic** — by using cookies, headers, searchParams or
 * `force-dynamic` anywhere in its tree — this would move to request time, where
 * `public/` is served by the CDN and is not in the serverless bundle. Keep the
 * page static, or move this to a build-time generated manifest.
 */
export function getAlbumImages(): string[] {
  const files = fs
    .readdirSync(ALBUM_DIR)
    .filter((f) => IMAGE_FILE.test(f))
    .sort()

  if (files.length === 0) {
    throw new Error(
      `No images found in ${ALBUM_DIR}. The gallery would render empty, so this ` +
        `fails the build rather than shipping a blank section.`
    )
  }

  return files
}
