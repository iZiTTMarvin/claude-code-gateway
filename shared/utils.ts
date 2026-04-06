/**
 * 共享工具函数
 */

/** 生成 UUID（兼容浏览器和 Node.js） */
export function randomUUID(): string {
  return crypto.randomUUID()
}
