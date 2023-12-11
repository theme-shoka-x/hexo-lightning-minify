# hexo-lightning-minify
## 简介

此插件为[hexo-renderer-multi-next-markdown-it](https://github.com/theme-shoka-x/hexo-renderer-multi-next-markdown-it)拆分出的缩小器模块。
基于更现代的缩小器重构(例如`lightningcss`和`minify-html`)，速度相较于旧版大幅提升。

如果你需要更全面的优化可以试试[hexo-optimize](https://github.com/next-theme/hexo-optimize)。本项目更倾向于作为 ShokaX 的配套支持包存在，因而仅存在基本的缩小与优化功能。

## 安装
```shell
pnpm add hexo-lightning-minify # 建议使用pnpm
npm install hexo-lightning-minify
```

## 配置
```yaml
minify:
  js:
    enable: true # ShokaX 自带 esbuild 优化，不建议开启，其他主题建议开启
    exclude: # 排除文件，接受 string[]，需符合 micromatch 格式
  css:
    enable: true # 开启 CSS 优化
    options:
      targets: ">= 0.5%" # browserslist 格式的 target
    exclude: # 排除文件，接受 string[]，需符合 micromatch 格式
  html:
    enable: true # 开启 HTML 优化
    options:
      comments: false # 是否保留注释内容
    exclude: # 排除文件，接受 string[]，需符合 micromatch 格式
```

## 功能
- [x] 自动缩小 js、css 和 html
- [x] 基于 targets 自动处理 CSS 前缀兼容
- [ ] 自动 webp 化与图片预处理
- [ ] 自动预连接优化(长期)

## 比较
WIP