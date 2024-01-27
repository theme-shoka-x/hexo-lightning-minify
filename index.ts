import type Hexo from 'hexo'
import { minifyHtml } from './lib/html'
import { minifyCss } from './lib/css'
import { minifyJs } from './lib/js'
import { injectThumbHash, replaceSrc, transformImage, transformThumbHash } from './lib/img'

declare const hexo:Hexo

hexo.config.minify.js = Object.assign({
  enable: false,
  options: {
    comments: false,
    ecma: 2020,
    toplevel: false
  },
  exclude: []
}, hexo.config.minify?.js)

hexo.config.minify.css = Object.assign({
  enable: true,
  options: {
    targets: null
  },
  exclude: []
}, hexo.config.minify?.css)

hexo.config.minify.html = Object.assign({
  enable: true,
  options: {
    comments: false
  },
  exclude: []
}, hexo.config.minify?.html)

hexo.config.minify.image = Object.assign({
  enable: true,
  options: {
    webp: true,
    avif: false,
    quality: 80,
    effort: 2,
    replaceSrc: true
  },
  exclude: []
}, hexo.config.minify?.image)

if (hexo.config.minify.html.enable) {
  hexo.extend.filter.register('after_render:html', minifyHtml)
}
if (hexo.config.minify.css.enable) {
  hexo.extend.filter.register('after_render:css', minifyCss)
}
if (hexo.config.minify.js.enable) {
  hexo.extend.filter.register('after_render:js', minifyJs)
}
if (hexo.config.minify.image.enable) {
  hexo.extend.filter.register('after_generate', transformImage, 50)
  if (hexo.config.minify.image.options.replaceSrc) {
    hexo.extend.filter.register('after_render:html', replaceSrc, 1)
  }
  if (hexo.config.minify.image.preprocess.thumbhash.enable) {
    hexo.extend.filter.register('after_generate', transformThumbHash, 40)
    hexo.extend.filter.register('after_render:html', injectThumbHash, 2)
    if (hexo.config.minify.image.preprocess.thumbhash.injectUnlazy) {
      hexo.extend.injector.register('head_end', '<script src="https://npm.webcache.cn/unlazy@0.10.4/dist/unlazy.with-hashing.iife.js" defer init></script>')
    }
  }
}
