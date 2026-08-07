import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageUploadView } from './ImageUploadView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageUpload: {
      /** 在光标处插入图片上传占位节点 */
      insertImageUpload: (uploadId: string) => ReturnType
    }
  }
}

export const ImageUpload = Node.create({
  name: 'imageUpload',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      uploadId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-id'),
        renderHTML: (attributes) => ({ 'data-upload-id': attributes.uploadId }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-upload-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addCommands() {
    return {
      insertImageUpload:
        (uploadId: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { uploadId } }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageUploadView)
  },
})
