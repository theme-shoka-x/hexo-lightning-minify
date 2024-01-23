import { minify } from '@minify-html/node'
import { isExclude } from './utils'
import type Hexo from 'hexo'

interface HtmlMinifyConfig {
  enable: boolean
  options: {
    comments: boolean
  }
  exclude: string[]
}
export function minifyHtml (this: Hexo, str:string, data:any) {
  const { options, exclude } = this.config.minify.html as HtmlMinifyConfig
  if (isExclude(data.path, exclude)) return str
  return minify(Buffer.from(str), {
    keep_spaces_between_attributes: true,
    keep_comments: options.comments
  }).toString()
}
