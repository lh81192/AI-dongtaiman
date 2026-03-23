/**
 * EPUB Parser
 * 解析 EPUB 文件，提取图片和文本
 */

import ePub from 'epubjs';
import type { Book, Contents } from 'epubjs';
import type {
  EPUBParseResult,
  EPUBPage,
  EPUBMedia,
  EPUBMetadata,
} from './types';

export class EPUBParser {
  private book: Book | null = null;

  /**
   * 加载 EPUB 文件
   */
  async load(fileBuffer: ArrayBuffer): Promise<void> {
    this.book = ePub(fileBuffer);
    await this.book.ready;
  }

  /**
   * 加载远程 EPUB
   */
  async loadUrl(url: string): Promise<void> {
    this.book = ePub(url);
    await this.book.ready;
  }

  /**
   * 解析 EPUB 并提取所有页面
   */
  async parse(): Promise<EPUBParseResult> {
    if (!this.book) {
      throw new Error('EPUB not loaded');
    }

    const metadata = await this.extractMetadata();
    const allImages: EPUBMedia[] = [];

    // 加载 manifest 以提取图片资源
    const manifest = await this.book.loaded.manifest;
    for (const [id, item] of Object.entries(manifest)) {
      if (item.type && item.type.startsWith('image/')) {
        const image: EPUBMedia = {
          id,
          src: item.href || id,
          type: item.type,
        };
        allImages.push(image);
      }
    }

    // 从 spine 遍历每个 HTML 文档作为页面
    const pages: EPUBPage[] = [];
    let pageIndex = 0;

    // spine.each() iterates over each spine item
    this.book.spine.each((item: any) => {
      try {
        const section = this.book!.spine.get(item.index);
        if (!section) return;

        const doc = section.load();
        const page = this.extractPageFromDocument(
          doc as unknown as Document,
          pageIndex,
          allImages
        );
        pages.push(page);
        pageIndex++;
        section.unload();
      } catch (error) {
        console.error(`Failed to parse page ${item.href}:`, error);
      }
    });

    return {
      metadata,
      pages,
      chapters: [],
      allImages,
      baseUrl: '',
    };
  }

  /**
   * 从文档中提取页面内容
   */
  private extractPageFromDocument(
    doc: Document,
    index: number,
    allImages: EPUBMedia[]
  ): EPUBPage {
    const images: EPUBMedia[] = [];

    // 提取图片
    const imgElements = doc.querySelectorAll('img');
    for (let i = 0; i < imgElements.length; i++) {
      const img = imgElements[i];
      const src = img.getAttribute('src') || '';
      const id = img.getAttribute('id') || `img-${index}-${i}`;

      // 查找匹配的图片资源
      const matchedImage = allImages.find(
        (ri) => ri.src.includes(src) || ri.id === id
      );

      if (matchedImage) {
        images.push(matchedImage);
      } else {
        images.push({
          id,
          src,
          type: 'image/unknown',
        });
      }
    }

    // 提取文本
    const body = doc.body || doc.documentElement;
    const text = this.extractText(body);

    return {
      index,
      images,
      text,
      rawHtml: body.innerHTML,
    };
  }

  /**
   * 递归提取文本内容
   */
  private extractText(element: Element): string {
    let text = '';
    const childNodes = element.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (['P', 'DIV', 'BR', 'LI'].includes(el.tagName)) {
          text += '\n';
        }
        text += this.extractText(el);
      }
    }
    return text.trim();
  }

  /**
   * 提取元数据
   */
  private async extractMetadata(): Promise<EPUBMetadata> {
    if (!this.book) {
      throw new Error('EPUB not loaded');
    }

    const meta = await this.book.loaded.metadata;

    return {
      title: meta.title || 'Untitled',
      author: meta.creator || undefined,
      language: meta.language,
      publisher: meta.publisher,
      cover: undefined, // resolved separately via getCoverImage
      description: meta.description,
    };
  }

  /**
   * 获取封面图片 URL
   */
  async getCoverImage(): Promise<string | null> {
    if (!this.book) return null;

    try {
      const cover = await this.book.loaded.cover;
      if (cover && this.book.archive) {
        const url = await this.book.archive.createUrl(cover, { base64: false });
        return url;
      }
      const coverUrl = await this.book.coverUrl();
      return coverUrl;
    } catch {
      return null;
    }
  }

  /**
   * 获取指定页面渲染后的图片 URL
   */
  async renderPageToImage(
    pageIndex: number,
    width: number = 800
  ): Promise<string | null> {
    if (!this.book) return null;

    try {
      const rendition = this.book.renderTo('canvas', {
        width,
        spread: 'none' as const,
      });

      await rendition.display(pageIndex);

      // Note: getContents() returns an array at runtime; type def says Contents due to outdated DefinitelyTyped
      const contents = rendition.getContents() as unknown as Contents[];
      if (contents && contents.length > 0) {
        const doc = contents[0].document;
        const canvas = (doc as Document).querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          rendition.destroy();
          return dataUrl;
        }
      }

      rendition.destroy();
    } catch (error) {
      console.error(`Failed to render page ${pageIndex}:`, error);
    }
    return null;
  }

  /**
   * 关闭并清理资源
   */
  destroy(): void {
    if (this.book) {
      this.book.destroy();
      this.book = null;
    }
  }
}

/**
 * 便捷函数：从 File 对象解析 EPUB
 */
export async function parseEPUB(file: File): Promise<EPUBParseResult> {
  const buffer = await file.arrayBuffer();
  const parser = new EPUBParser();
  await parser.load(buffer);
  const result = await parser.parse();
  parser.destroy();
  return result;
}

/**
 * 便捷函数：从 URL 解析 EPUB
 */
export async function parseEPUBFromUrl(url: string): Promise<EPUBParseResult> {
  const parser = new EPUBParser();
  await parser.loadUrl(url);
  const result = await parser.parse();
  parser.destroy();
  return result;
}
