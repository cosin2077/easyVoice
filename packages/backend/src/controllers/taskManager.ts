import crypto from 'crypto'

interface Options {
  prefix?: string
  length?: number
}
export interface Task {
  id: string
  fields: any
  status: string
  progress: number
  message: string
  code?: string | number
  result: any
  createdAt: Date
  updatedAt?: Date
  updateProgress?: (taskId: string, progress: number) => Task | undefined
}
class TaskManager {
  tasks: Map<string, Task>
  constructor() {
    this.tasks = new Map()
  }

  generateTaskId(fields: any, options: Options = {}) {
    const { prefix = 'task', length = 16 } = options

    const hash = crypto.createHash('md5')

    Object.keys(fields)
      .sort()
      .forEach((key) => {
        const value = fields[key]
        hash.update(key)
        if (typeof value === 'string' && value.length > 1000) {
          for (let i = 0; i < value.length; i += 1000) {
            hash.update(value.slice(i, i + 1000))
          }
        } else {
          hash.update(JSON.stringify(value))
        }
      })

    const hashValue = hash.digest('hex')
    return `${prefix}${hashValue.slice(0, length)}`
  }

  createTask(fields: any, options?: Options): Task {
    const taskId = this.generateTaskId(fields, options)
    if (this.getTask(taskId)) {
      throw new Error(`task: ${taskId} already exists!`)
    }
    const task = {
      id: taskId,
      fields,
      status: 'pending',
      progress: 0,
      message: '',
      result: null,
      createdAt: new Date(),
      updateProgress: this.updateProgress.bind(this),
    }
    this.tasks.set(taskId, task)
    return task
  }

  finishTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Cannot find task: ${taskId}`)
    task.status = 'completed'
    task.progress = 100
    task.updatedAt = new Date()
    this.tasks.set(taskId, task)
    return task
  }

  getTask(taskId: string) {
    return this.tasks.get(taskId) || null
  }
  failTask(taskId: string, { code, message }: { code?: number; message: string }) {
    const findTask = this.getTask(taskId)
    if (!findTask) {
      throw new Error(`Cannot find task: ${taskId}`)
    }
    findTask.status = 'failed'
    findTask.message = message
    findTask.code = code
    findTask.updatedAt = new Date()
    this.tasks.set(taskId, findTask)
    return true
  }
  updateProgress(taskId: string, progress: number): Task | undefined {
    const findTask = this.getTask(taskId)
    if (!findTask) return
    findTask.progress = progress
    findTask.updatedAt = new Date()
    this.tasks.set(taskId, findTask)
    return findTask
  }
  updateTask(taskId: string, result: any) {
    const findTask = this.getTask(taskId)
    if (!findTask) {
      throw new Error(`Cannot find task: ${taskId}`)
    }
    findTask.result = result
    this.tasks.set(taskId, findTask)
    return findTask
  }
}
const instance = new TaskManager()
export default instance
