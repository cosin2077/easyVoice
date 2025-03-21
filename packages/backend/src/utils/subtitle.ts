interface SubtitleItem {
  part: string
  start: number
  end: number
}

// 定义函数的输入类型
export type SubtitleFile = SubtitleItem[]
export type SubtitleFiles = SubtitleFile[]

// 自定义错误类
class SubtitleMergeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubtitleMergeError'
  }
}

/**
 * 合并多个字幕文件为一个连续的字幕序列
 * @param subtitleFiles 包含多个字幕文件的数组
 * @param gap 可选的每个文件之间的间隙时间（默认为0）
 * @returns 合并后的字幕数组
 * @throws SubtitleMergeError 如果输入无效
 */
export function mergeSubtitleFiles(subtitleFiles: SubtitleFiles, gap: number = 0): SubtitleItem[] {
  if (!Array.isArray(subtitleFiles))
    throw new SubtitleMergeError('Input must be an array of subtitle files')

  if (subtitleFiles.length === 0) return []

  if (typeof gap !== 'number' || gap < 0)
    throw new SubtitleMergeError('Gap must be a non-negative number')

  const mergedSubtitles: SubtitleItem[] = []
  let timeOffset = 0

  try {
    subtitleFiles.forEach((file, index) => {
      if (!Array.isArray(file)) {
        throw new SubtitleMergeError(`Subtitle file at index ${index} is not an array`)
      }

      file.forEach((item, itemIndex) => {
        if (!isValidSubtitleItem(item)) {
          throw new SubtitleMergeError(`Invalid subtitle item at file ${index}, item ${itemIndex}`)
        }
      })

      const adjustedFile = file.map((item) => ({
        part: item.part,
        start: item.start + timeOffset,
        end: item.end + timeOffset,
      }))

      mergedSubtitles.push(...adjustedFile)

      if (file.length > 0 && index < subtitleFiles.length - 1) {
        const lastItem = file[file.length - 1]
        timeOffset = lastItem.end + timeOffset + gap
      }
    })

    return mergedSubtitles
  } catch (error) {
    if (error instanceof SubtitleMergeError) {
      throw error
    }
    throw new SubtitleMergeError(`Failed to merge subtitles: ${(error as Error).message}`)
  }
}

// 辅助函数：验证字幕项格式
function isValidSubtitleItem(item: any): item is SubtitleItem {
  return (
    item != null &&
    typeof item === 'object' &&
    typeof item.part === 'string' &&
    typeof item.start === 'number' &&
    typeof item.end === 'number' &&
    item.start >= 0 &&
    item.end >= item.start
  )
}
