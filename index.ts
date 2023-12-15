import type Hexo from 'hexo'
import {minify_html} from "./lib/html";
import {minify_css} from "./lib/css";
import {minify_js} from "./lib/js";
import {replaceSrc, transformImage} from "./lib/img";

declare const hexo:Hexo

hexo.config.minify.js = Object.assign({
  enable: false,
  options: {
    comments: false,
    ecma: 2020,
    toplevel: false
  },
  exclude: []
},hexo.config.minify.js)

hexo.config.minify.css = Object.assign({
  enable: true,
  options: {
    targets: null
  },
  exclude: []
},hexo.config.minify.css)

hexo.config.minify.html = Object.assign({
  enable: true,
  options: {
    comments: false
  },
  exclude: []
},hexo.config.minify.html)

hexo.config.minify.image = Object.assign({
  enable: true,
  options: {
    webp: true,
    avif: false,
    quality: 80,
    effort: 2,
    replaceSrc: true,
  },
  exclude: []
},hexo.config.minify.image)

hexo.extend.filter.register("after_render:html", minify_html)
hexo.extend.filter.register("after_render:css", minify_css)
hexo.extend.filter.register("after_render:js", minify_js)
if (hexo.config.minify.image.enable) {
  hexo.extend.filter.register("after_generate", transformImage, 50)
  if (hexo.config.minify.image.options.replaceSrc) {
    hexo.extend.filter.register("after_render:html", replaceSrc, 1)
  }
}

