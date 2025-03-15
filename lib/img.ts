/* eslint-disable camelcase */
import path from 'node:path'
import fs from 'fs/promises'
import sharp from 'sharp'
import type Hexo from 'hexo'
import { isExclude } from './utils'
import { load } from 'cheerio'
import { Readable } from 'node:stream'
import { createHash } from 'node:crypto'
import { CacheDB } from './cacheDB'

interface transformImageOptions {
  enable: boolean
  options: {
    avif: boolean
    webp: boolean
    quality: number | 'lossless' | 'nearLossless'
    enableSubSampling: boolean
    effort: number
    replaceSrc: boolean
    persistCache: boolean
  }
  exclude: string[]
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    stream.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      const fullBuffer = Buffer.concat(chunks);
      resolve(fullBuffer);
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

const cacheDB = new CacheDB()

export async function transformImage (this: Hexo) {
  let transformedImageExt = ''
  const publicDir = this.public_dir
  const { options, exclude } = this.config.minify.image as transformImageOptions
  let sharpAvifOptions: Partial<sharp.AvifOptions> | undefined
  let sharpWebpOptions: Partial<sharp.WebpOptions> | undefined
  if (options.avif) {
    sharpAvifOptions = {
      effort: options.effort,
      lossless: false,
      quality: 60,
      chromaSubsampling: options.enableSubSampling ? '4:2:0' : '4:4:4',
    }
    if (options.quality === 'lossless') {
      sharpAvifOptions.lossless = true
    } else if (options.quality === 'nearLossless') {
      throw new Error('nearLossless is not supported in avif format')
    } else {
      sharpAvifOptions.quality = options.quality
    }
    transformedImageExt = '.avif'
  } else if (options.webp) {
    sharpWebpOptions = {
      effort: options.effort,
      lossless: false,
      nearLossless: false,
      smartSubsample: options.enableSubSampling,
      quality: 80,
    }
    if (options.quality === 'lossless') {
      sharpWebpOptions.lossless = true
    } else if (options.quality === 'nearLossless') {
      sharpWebpOptions.nearLossless = true
    } else {
      sharpWebpOptions.quality = options.quality
    }
    transformedImageExt = '.webp'
  } else {
    throw new Error('No image format selected for conversion. Please enable either AVIF or WebP.')
  }

  const imagesPaths = this.route.list().filter(item => item.match(/\.(png|jpg|gif|jpeg)$/i))
  const streamsOfImages = imagesPaths.map(item => this.route.get(item))
  const images = imagesPaths.map((image, index) => ({
    path: image,
    stream: streamsOfImages[index],
    cached: false
  }));


  if (options.persistCache) {
    await cacheDB.readDB()
  }

  await Promise.all(images.map(async image => {
    if (isExclude(image.path, exclude)) {
      return
    }

    const sourceBuffer = await streamToBuffer(image.stream)
    const transformedPath = image.path.replace(/\.(png|jpg|gif|jpeg)$/i, transformedImageExt)

    const transformedImagePath = path.join(publicDir, transformedPath)

    if (options.persistCache) {
      
      const sourcePathHash = createHash('sha256').update(image.path).digest('hex')
      const sourceImageHash = createHash('sha256').update(sourceBuffer).digest('hex')

      const cachedHash = cacheDB.getImageHash(sourcePathHash)

      if (cachedHash && cachedHash === sourceImageHash) {
        const cacheImage = await fs.readFile(`./lightning-minify/images/${sourcePathHash}${transformedImageExt}`)
        this.route.set(transformedPath, cacheImage)
        image.cached = true
        this.log.info(`Using cached image for ${image.path} (${cacheImage.length} bytes)`)
        return
      } else {
        await cacheDB.setImageHash(sourcePathHash, sourceImageHash)
      }
    }

    if (!(await fs.access(transformedImagePath).catch(() => false))) {
      const sharpImage = sharp(sourceBuffer)
      const transformedSharp = options.webp ? sharpImage.webp(sharpWebpOptions) : sharpImage.avif(sharpAvifOptions)
      transformedSharp.toBuffer()
        .then(async info => {
          this.route.set(transformedPath, info)
          if (this.config.minify.image.options.destroyOldRoute) {
            this.route.remove(image.path)
          }
          this.log.info(`Converted ${image.path} to ${transformedImageExt} (saved ${((sourceBuffer.length - info.length)/sourceBuffer.length * 100).toFixed(2)}%)`)
          if (options.persistCache) {
            const sourcePathHash = createHash('sha256').update(image.path).digest('hex')
            await fs.writeFile(`./lightning-minify/images/${sourcePathHash}${transformedImageExt}`, info)
          }
        })
        .catch((err) => {
          this.log.error(`Error converting ${image.path} to ${transformedImageExt}:`, err)
        })
    }
  }))

  if (options.persistCache) {
    await cacheDB.writeDB()
  }
}

const isLocalLink = function (hexo: Hexo, origin: string, src?: string) {
  if (src && src.startsWith('http')) return false
  return (src && (src.startsWith('/') || src.startsWith('.') || new URL(src, hexo.config.url).origin === origin) && /\.(png|jpg|gif)$/.test(src))
}

export function replaceSrc (this: Hexo, str: string) {
  let transformedImageExt = ''
  if (this.config.minify.image.options.webp) {
    transformedImageExt = '.webp'
  } else if (this.config.minify.image.options.avif) {
    transformedImageExt = '.avif'
  }
  const $ = load(str)
  const origin = new URL(this.config.url).origin
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const hexo = this

  function replaceLink (src: string) {
    const srcO = path.parse(src)
    return path.join(srcO.dir, srcO.name + transformedImageExt).replace(/\\/g, '/')
  }

  $('img').each(function () {
    const img = $(this)
    const src = img.attr('src')
    const dataSrc = img.attr('data-src')

    if (isLocalLink(hexo, origin, src) && typeof src !== 'undefined') {
      img.attr('src', replaceLink(src))
    }
    if (isLocalLink(hexo, origin, dataSrc) && typeof dataSrc !== 'undefined') {
      img.attr('data-src', replaceLink(dataSrc))
    }
  })

  $('div .cover').each(function () {
    const div = $(this);
    const dataBgImg = div.attr('data-background-image');
    if (isLocalLink(hexo, origin, dataBgImg) && typeof dataBgImg !== 'undefined') {
        div.attr('data-background-image', replaceLink(dataBgImg));
    }
  })

  return $.html()
}
