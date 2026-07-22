import { getSecret } from './crypto'

/**
 * 上传图片到 ImgBB 图床（共享方法，Toolbar 和 MiddlePanel 共用）
 * @param file 图片文件
 * @param onSuccess 上传成功回调，传入原图直链 URL
 * @param onError 上传失败回调
 */
export async function uploadImage(
  file: File,
  onSuccess: (url: string) => void,
  onError: (msg: string) => void,
): Promise<void> {
  const apiKey = getSecret('imgbb_api_key')
  if (!apiKey) { onError('图床 Key 异常，请刷新页面'); return }

  let expiration = 0
  const expStr = getSecret('imgbb_expiration')
  if (expStr) expiration = parseInt(expStr) || 0

  try {
    const b64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve((r.result as string).split(',')[1])
      r.onerror = () => reject(new Error('读取文件失败'))
      r.readAsDataURL(file)
    })

    const form = new FormData()
    form.append('key', apiKey)
    form.append('image', b64)
    if (expiration > 0) form.append('expiration', String(expiration))

    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`上传失败 (${res.status}): ${err.slice(0, 100)}`)
    }
    const json = await res.json()
    const url = json?.data?.image?.url || json?.data?.url
    if (!url) throw new Error('接口未返回图片地址')

    onSuccess(url)
  } catch (err: any) {
    onError('图片上传失败: ' + (err?.message || '未知错误'))
  }
}
