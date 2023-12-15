import path from "node:path"
import fs from 'fs/promises'
import sharp from "sharp"
import type Hexo from "hexo";
import {isExclude} from "./utils";
import { load } from 'cheerio'

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
export async function transformImage (this: Hexo) {
  const publicDir = this.public_dir;
  const {options,exclude} = this.config.minify.image as transformImageOptions
  const sharpOptions = {
    effort: options.effort,
    lossless: false,
    nearLossless: false,
    quality: 100
  }
  if (options.quality === "lossless") {
    sharpOptions.lossless = true
  } else if (options.quality === "nearLossless") {
    sharpOptions.nearLossless = true
  } else {
    sharpOptions.quality = options.quality
  }

  const images = this.route.list().filter(item => item.match(/\.(png|jpg|gif)$/i));
  let firstRun = false

  await Promise.all(images.map(async imagePath => {
    if (isExclude(imagePath,exclude)){
      return
    }
    const webpPath = imagePath.replace(/\.(png|jpg|gif)$/i, '.webp');

    const sourceImagePath = path.join(publicDir, imagePath);
    const webpImagePath = path.join(publicDir, webpPath);

    if (!(await fs.access(webpImagePath).catch(() => false))) {
      await sharp(sourceImagePath)
        .webp(sharpOptions)
        .toFile(webpImagePath)
        .then(info => {
          this.log.info(`Converted ${imagePath} to WebP (${info.size} bytes)`);
        })
        .catch((err) => {
          if (err.toString().indexOf('Input file is missing')!==-1){
            firstRun = true
          } else {
            this.log.error(`Error converting ${imagePath} to WebP:`, err);
          }
        });
    }
  }));

  if (firstRun) {
    this.log.warn("The the WebP converter can not run correctly when you run hexo g after hexo cl, please run the hexo g again")
  }
}

export function replaceSrc(this: Hexo, str:string){
  const $ = load(str, { decodeEntities: false });
  const origin = new URL(this.config.url).origin

  function replaceLink(src:string){
    const srcO = path.parse(src)
    return path.join(srcO.dir, srcO.name + '.webp').replace(/\\/g, '/')
  }

  function isLocalLink(src?:string){
    return (src && (src.startsWith('/') || new URL(src).origin === origin) && /\.(png|jpg|gif)$/.test(src));
  }

  $('img').each(function (){
    const img = $(this)
    let src = img.attr('src');
    let dataSrc = img.attr('data-src');
    let dataBgImg = img.attr('data-background-image');

    if (isLocalLink(src) && typeof src !== 'undefined') {
      img.attr('src',replaceLink(src))
    }
    if (isLocalLink(dataSrc) && typeof dataSrc !== 'undefined') {
      img.attr('data-src',replaceLink(dataSrc))
    }
    if (isLocalLink(dataBgImg) && typeof dataBgImg !== 'undefined') {
      img.attr('data-background-image',replaceLink(dataBgImg))
    }

  })

  return $.html()
}