/* eslint-disable camelcase */
import path from 'node:path'
import fs from 'fs/promises'
import sharp from 'sharp'
import type Hexo from 'hexo'
import { isExclude } from './utils'
import { load } from 'cheerio'

/** !
 * Encodes an RGBA image to a PNG data URI. RGB should not be premultiplied by A.
 *
 * @remarks
 * This is optimized for speed and simplicity and does not optimize for size
 * at all. This doesn't do any compression (all values are stored uncompressed).
 *
 * @see https://github.com/evanw/thumbhash
 * @author Evan Wallace
 * @license MIT
 */
function rgbaToThumbHash (w: number, h: number, rgba: number[] | Uint8Array) {
  // Encoding an image larger than 100x100 is slow with no benefit
  if (w > 100 || h > 100) throw new Error(`${w}x${h} doesn't fit in 100x100`)
  const { PI, round, max, cos, abs } = Math

  // Determine the average color
  let avg_r = 0; let avg_g = 0; let avg_b = 0; let avg_a = 0
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    const alpha = rgba[j + 3] / 255
    avg_r += alpha / 255 * rgba[j]
    avg_g += alpha / 255 * rgba[j + 1]
    avg_b += alpha / 255 * rgba[j + 2]
    avg_a += alpha
  }
  if (avg_a) {
    avg_r /= avg_a
    avg_g /= avg_a
    avg_b /= avg_a
  }

  const hasAlpha = avg_a < w * h as any
  const l_limit = hasAlpha ? 5 : 7 // Use fewer luminance bits if there's alpha
  const lx = max(1, round(l_limit * w / max(w, h)))
  const ly = max(1, round(l_limit * h / max(w, h)))
  const l = [] // luminance
  const p = [] // yellow - blue
  const q = [] // red - green
  const a = [] // alpha

  // Convert the image from RGBA to LPQA (composite atop the average color)
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    const alpha = rgba[j + 3] / 255
    const r = avg_r * (1 - alpha) + alpha / 255 * rgba[j]
    const g = avg_g * (1 - alpha) + alpha / 255 * rgba[j + 1]
    const b = avg_b * (1 - alpha) + alpha / 255 * rgba[j + 2]
    l[i] = (r + g + b) / 3
    p[i] = (r + g) / 2 - b
    q[i] = r - g
    a[i] = alpha
  }

  // Encode using the DCT into DC (constant) and normalized AC (varying) terms
  const encodeChannel = (channel: number[], nx: number, ny: number) => {
    let dc = 0; const ac = []; let scale = 0; const fx = []
    for (let cy = 0; cy < ny; cy++) {
      for (let cx = 0; cx * ny < nx * (ny - cy); cx++) {
        let f = 0
        for (let x = 0; x < w; x++) { fx[x] = cos(PI / w * cx * (x + 0.5)) }
        for (let y = 0; y < h; y++) {
          for (let x = 0, fy = cos(PI / h * cy * (y + 0.5)); x < w; x++) { f += channel[x + y * w] * fx[x] * fy }
        }
        f /= w * h
        if (cx || cy) {
          ac.push(f)
          scale = max(scale, abs(f))
        } else {
          dc = f
        }
      }
    }
    if (scale) {
      for (let i = 0; i < ac.length; i++) { ac[i] = 0.5 + 0.5 / scale * ac[i] }
    }
    return [dc, ac, scale]
  }
  const [l_dc, l_ac, l_scale] = encodeChannel(l, max(3, lx), max(3, ly)) as [number, number, number]
  const [p_dc, p_ac, p_scale] = encodeChannel(p, 3, 3) as [number, number, number]
  const [q_dc, q_ac, q_scale] = encodeChannel(q, 3, 3) as [number, number, number]
  const [a_dc, a_ac, a_scale] = hasAlpha ? encodeChannel(a, 5, 5) as [number, number, number] : []

  // Write the constants
  const isLandscape = w > h as any
  const header24 = round(63 * l_dc) | (round(31.5 + 31.5 * p_dc) << 6) | (round(31.5 + 31.5 * q_dc) << 12) | (round(31 * l_scale) << 18) | (hasAlpha << 23)
  const header16 = (isLandscape ? ly : lx) | (round(63 * p_scale) << 3) | (round(63 * q_scale) << 9) | (isLandscape << 15)
  const hash = [header24 & 255, (header24 >> 8) & 255, header24 >> 16, header16 & 255, header16 >> 8]
  const ac_start = hasAlpha ? 6 : 5
  let ac_index = 0
  if (hasAlpha) {
    // @ts-expect-error bypass null check
    hash.push(round(15 * a_dc) | (round(15 * a_scale) << 4))
  }

  // Write the varying factors
  for (const ac of hasAlpha ? [l_ac, p_ac, q_ac, a_ac] : [l_ac, p_ac, q_ac]) {
    // @ts-expect-error type error
    for (const f of ac) { hash[ac_start + (ac_index >> 1)] |= round(15 * f) << ((ac_index++ & 1) << 2) }
  }
  return new Uint8Array(hash)
}

interface transformImageOptions {
  enable: boolean
  options: {
    avif: boolean // TODO 兼容多种格式处理
    webp: boolean // TODO 兼容多种格式处理
    quality: number | 'lossless' | 'nearLossless'
    effort: number
    replaceSrc: boolean
  }
  exclude: string[]
}

interface preProcessImageOptions {
  persistentDB: string
  thumbHash: {
    enable: boolean
    maxSize: number
    injectDataThumbHash: boolean
    injectDataSrc: boolean
    injectUnlazy: boolean
  }
}

type imageDB = {
  thumbhash: {
    height: number
    width: number
    hash: string
  }
}

export async function transformImage (this: Hexo) {
  const publicDir = this.public_dir
  const { options, exclude } = this.config.minify.image as transformImageOptions
  const sharpOptions: Partial<sharp.WebpOptions> = {
    effort: options.effort,
    lossless: false,
    nearLossless: false,
    quality: 100
  }
  if (options.quality === 'lossless') {
    sharpOptions.lossless = true
  } else if (options.quality === 'nearLossless') {
    sharpOptions.nearLossless = true
  } else {
    sharpOptions.quality = options.quality
  }

  const images = this.route.list().filter(item => item.match(/\.(png|jpg|gif)$/i))
  let firstRun = false

  await Promise.all(images.map(async imagePath => {
    if (isExclude(imagePath, exclude)) {
      return
    }
    const webpPath = imagePath.replace(/\.(png|jpg|gif)$/i, '.webp')

    const sourceImagePath = path.join(publicDir, imagePath)
    const webpImagePath = path.join(publicDir, webpPath)

    if (!(await fs.access(webpImagePath).catch(() => false))) {
      await sharp(sourceImagePath)
        .webp(sharpOptions)
        .toFile(webpImagePath)
        .then(info => {
          this.log.info(`Converted ${imagePath} to WebP (${info.size} bytes)`)
        })
        .catch((err) => {
          if (err.toString().indexOf('Input file is missing') !== -1) {
            firstRun = true
          } else {
            this.log.error(`Error converting ${imagePath} to WebP:`, err)
          }
        })
    }
  }))

  if (firstRun) {
    this.log.warn('The the WebP converter can not run correctly when you run hexo g after hexo cl, please run the hexo g again')
  }
}

const isLocalLink = function (hexo: Hexo, origin: string, src?: string) {
  if (src && src.startsWith('http')) return false
  return (src && (src.startsWith('/') || src.startsWith('.') || new URL(src, hexo.config.url).origin === origin) && /\.(png|jpg|gif)$/.test(src))
}

export function replaceSrc (this: Hexo, str: string) {
  const $ = load(str, { decodeEntities: false })
  const origin = new URL(this.config.url).origin
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const hexo = this

  function replaceLink (src: string) {
    const srcO = path.parse(src)
    return path.join(srcO.dir, srcO.name + '.webp').replace(/\\/g, '/')
  }

  $('img').each(function () {
    const img = $(this)
    const src = img.attr('src')
    const dataSrc = img.attr('data-src')
    const dataBgImg = img.attr('data-background-image')

    if (isLocalLink(hexo, origin, src) && typeof src !== 'undefined') {
      img.attr('src', replaceLink(src))
    }
    if (isLocalLink(hexo, origin, dataSrc) && typeof dataSrc !== 'undefined') {
      img.attr('data-src', replaceLink(dataSrc))
    }
    if (isLocalLink(hexo, origin, dataBgImg) && typeof dataBgImg !== 'undefined') {
      img.attr('data-background-image', replaceLink(dataBgImg))
    }
  })

  return $.html()
}
