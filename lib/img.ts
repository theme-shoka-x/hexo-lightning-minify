import path from 'node:path'
import fs from 'fs/promises'
import sharp from 'sharp'
import type Hexo from 'hexo'
import { isExclude } from './utils'
import { load } from 'cheerio'
import { rgbaToThumbHash } from 'thumbhash'
import { Buffer } from 'node:buffer'

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

function GenThumbHash (buffer: Uint8Array, width: number, height: number) {
  const res = rgbaToThumbHash(width, height, buffer)
  return Buffer.from(String.fromCharCode(...res), 'base64').toString()
}

export async function transformThumbHash (this: Hexo) {
  let database:any = {}
  try {
    database = JSON.parse(await fs.readFile(this.config.minify.image.preprocess.persistentDB, { encoding: 'utf-8' }))
  } catch (e) {
    this.log.warn('Persistent database not found, will create a new one')
  }
  const publicDir = this.public_dir
  const options = this.config.minify.image.preprocess as preProcessImageOptions
  const images = this.route.list().filter(item => item.match(/\.(png|jpg|gif)$/i))
  const firstRun = false

  await Promise.all(images.map(async imagePath => {
    const sourceImagePath = path.join(publicDir, imagePath)
    const imageDB: imageDB = {
      thumbhash: {
        height: 0,
        width: 0,
        hash: ''
      }
    }

    if (typeof database[sourceImagePath] !== 'undefined') {
      return
    }

    if (!(await fs.access(sourceImagePath).catch(() => false))) {
      const img = sharp(sourceImagePath)
      img
        .metadata()
        .then(({ width, height }) => {
          if (!width || !height) {
            throw new Error('Image metadata is not complete')
          }
          imageDB.thumbhash = {
            height,
            width,
            hash: ''
          }
          return sharp(sourceImagePath)
        }).catch((err) => {
          hexo.log.error(`Error reading ${imagePath} metadata:`, err)
        })
      img
        .resize({ height: options.thumbHash.maxSize, width: options.thumbHash.maxSize, fit: 'inside' })
        .toBuffer((err, buffer, info) => {
          if (err) {
            hexo.log.error(`Error reading ${imagePath} metadata:`, err)
          }
          imageDB.thumbhash.hash = GenThumbHash(buffer, info.width, info.height)
        })
      database[sourceImagePath] = imageDB
    }
    await fs.writeFile(options.persistentDB, JSON.stringify(database), { encoding: 'utf-8' })
  }))

  if (firstRun) {
    this.log.warn('The the WebP converter can not run correctly when you run hexo g after hexo cl, please run the hexo g again')
  }
}

export async function injectThumbHash (this: Hexo, str: string) {
  const options = this.config.minify.image.preprocess as preProcessImageOptions
  const publicDir = this.public_dir
  const database = JSON.parse(await fs.readFile(options.persistentDB, { encoding: 'utf-8' }))
  const $ = load(str, { decodeEntities: false })
  $('img').each(function () {
    const img = $(this)
    const src = img.attr('src')
    const sourceImagePath = path.join(publicDir, typeof src === 'string' ? src : '')

    if (options.thumbHash.injectDataSrc && typeof src !== 'undefined') {
      img.attr('data-src', src)
    }

    if (options.thumbHash.injectDataThumbHash && typeof src !== 'undefined') {
      if (typeof database[sourceImagePath] !== 'undefined') {
        img.attr('data-thumbhash', database[sourceImagePath].thumbhash.hash)
      }
    }

    img.attr('width', database[sourceImagePath].thumbhash.width)
    img.attr('height', database[sourceImagePath].thumbhash.height)
  })
  return $.html()
}
