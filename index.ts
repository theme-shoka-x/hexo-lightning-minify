import type Hexo from 'hexo'
import { minifyCss } from './lib/css'
import { minifyJs } from './lib/js'
import { replaceSrc, transformImage } from './lib/img'

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


hexo.config.minify.image = Object.assign({
  enable: true,
  options: {
    webp: true,
    avif: false,
    quality: 80,
    effort: 2,
    replaceSrc: true,
    destroyOldRoute: false
  },
  exclude: []
}, hexo.config.minify?.image)

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
}
