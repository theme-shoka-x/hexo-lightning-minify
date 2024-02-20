import { minify as minifyHtmlFast } from '@minify-html/node'
import { minify as minifyHtmlStable } from 'html-minifier'
import { isExclude } from './utils'
import type Hexo from 'hexo'

interface HtmlMinifyConfig {
  minifier: string
  enable: boolean
  options: {
    comments: boolean
  }
  exclude: string[]
}

export async function minifyHtml (this: Hexo, str: string, data: any) {
  const { options, exclude, minifier } = this.config.minify.html as HtmlMinifyConfig
  if (isExclude(data.path, exclude)) return str
  if (minifier === 'minify-html') {
    return minifyHtmlFast(Buffer.from(str), {
      keep_spaces_between_attributes: true,
      keep_comments: options.comments
    }).toString()
  } else {
    return minifyHtmlStable(str, {
      removeComments: !options.comments
    })
  }
}
