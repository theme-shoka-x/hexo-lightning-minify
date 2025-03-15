/* eslint-disable camelcase */
import path from 'node:path'
import fs from 'fs/promises'
import sharp from 'sharp'
import type Hexo from 'hexo'
import { isExclude } from './utils'
import { load } from 'cheerio'
import { Readable } from 'node:stream'

interface transformImageOptions {
  enable: boolean
  options: {
    avif: boolean
    webp: boolean
    quality: number | 'lossless' | 'nearLossless'
    enableSubSampling: boolean
    effort: number
    replaceSrc: boolean
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
  }));

  await Promise.all(images.map(async image => {
    if (isExclude(image.path, exclude)) {
      return
    }
    const transformedPath = image.path.replace(/\.(png|jpg|gif|jpeg)$/i, transformedImageExt)

    const transformedImagePath = path.join(publicDir, transformedPath)

    if (!(await fs.access(transformedImagePath).catch(() => false))) {
      const sharpImage = sharp(await streamToBuffer(image.stream))
      const transformedSharp = options.webp ? sharpImage.webp(sharpWebpOptions) : sharpImage.avif(sharpAvifOptions)
      transformedSharp.toBuffer()
        .then(info => {
          this.route.set(transformedPath, info)
          if (this.config.minify.image.options.destroyOldRoute) {
            this.route.remove(image.path)
          }
          this.log.info(`Converted ${image.path} to ${transformedImageExt} (${info.length} bytes)`)
        })
        .catch((err) => {
          this.log.error(`Error converting ${image.path} to ${transformedImageExt}:`, err)
        })
    }
  }))
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
    return path.join(srcO.dir, srcO.name + transformImage).replace(/\\/g, '/')
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

  $('div .cover').each(function () {
    const div = $(this)
    const style = div.attr('style')
    
    if (style) {
      // 使用正则表达式匹配 background-image 的 URL
      const updatedStyle = style.replace(
        /(background-image:\s*url\()(['"]?)(.*?)\2\)/gi,
        (match, prefix, quote, url) => {
          if (isLocalLink(hexo, origin, url)) {
            const newUrl = replaceLink(url)
            return `${prefix}${quote}${newUrl}${quote})`
          }
          return match
        }
      )

      div.attr('style', updatedStyle)
    }
  })

  return $.html()
}
