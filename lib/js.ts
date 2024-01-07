import {transform} from 'esbuild'
import type Hexo from "hexo";
import {isExclude} from "./utils";


interface JavascriptMinifyConfig {
  enable: boolean
  options: {

  }
  exclude?: string[]
}
export async function minify_js(this: Hexo, str:string,data:any){
  const {options,exclude} = this.config.minify.js as JavascriptMinifyConfig
  if (!data.path || isExclude(data.path,exclude)) return str
  return (await transform(str,{
    minify: true
  })).code
}