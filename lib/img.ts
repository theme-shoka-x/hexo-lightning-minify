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
    avif: boolean // TODO 兼容多种格式处理
    webp: boolean // TODO 兼容多种格式处理
    quality: number | 'lossless' | 'nearLossless'
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

  const imagesPaths = this.route.list().filter(item => item.match(/\.(png|jpg|gif)$/i))
  const streamsOfImages = imagesPaths.map(item => this.route.get(item))
  const images = imagesPaths.map((image, index) => ({
    path: image,
    stream: streamsOfImages[index],
  }));

  await Promise.all(images.map(async image => {
    if (isExclude(image.path, exclude)) {
      return
    }
    const webpPath = image.path.replace(/\.(png|jpg|gif)$/i, '.webp')

    const webpImagePath = path.join(publicDir, webpPath)

    if (!(await fs.access(webpImagePath).catch(() => false))) {
      await sharp(await streamToBuffer(image.stream))
        .webp(sharpOptions)
        .toBuffer()
        .then(info => {
          this.route.set(webpPath, info)
          if (this.config.minify.image.options.destroyOldRoute) {
            this.route.remove(image.path)
          }
          this.log.info(`Converted ${image.path} to WebP (${info.length} bytes)`)
        })
        .catch((err) => {
          this.log.error(`Error converting ${image.path} to WebP:`, err)
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
