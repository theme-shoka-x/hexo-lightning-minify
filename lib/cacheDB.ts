import fs from 'node:fs/promises'

interface DBData {
  version?: number
  images?: {
    [key: string]: {
      hash: string
    }
  }
}

export class CacheDB {
  data: DBData
  constructor() {
    this.data = { version: 1 }
  }

  async readDB() {
    await fs.mkdir('./lightning-minify/images', { recursive: true })
    try {
      const data = await fs.readFile('./lightning-minify/image.json', 'utf-8')
      this.data = JSON.parse(data)
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error
      }
      this.data = { version: 1, images: {} }
    }
  }

  async writeDB() {
    try {
      await fs.writeFile('./lightning-minify/image.json', JSON.stringify(this.data))
    } catch (error) {
      console.error('Error writing image cache db:', error)
    }
  }

  getImageHash(src:string): string | undefined {

    if (!this.data.images) {
      this.data.images = {}
    }
    return this.data.images[src]?.hash
  }

  async setImageHash(src: string, hash: string) {
    if (!this.data.images) {
      this.data.images = {}
    }
    this.data.images[src] = { hash }
  }
}