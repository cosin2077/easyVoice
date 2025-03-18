interface Task {
  (): Promise<any>;
}

export class MapLimitController {
  private cancelled: boolean = false;
  private runningTasks: Set<Promise<any>> = new Set();

  constructor(
    private tasks: Task[],
    private concurrency: number = 3,
    private callback: () => void = () => { }
  ) { }

  cancel(): void {
    this.cancelled = true;
  }

  run(): Promise<{ results: any[]; cancelled: boolean }> {
    if (!Array.isArray(this.tasks) || this.tasks.length === 0) {
      this.callback();
      return Promise.resolve({ results: [], cancelled: false });
    }
    if (this.concurrency < 1) { this.concurrency = 1 }

    let running = 0;
    let completed = 0;
    let index = 0;
    const results: any[] = [];
    const originalLength = this.tasks.length;

    return new Promise((resolve) => {
      const complete = () => {
        this.callback();
        resolve({ results, cancelled: this.cancelled });
      };

      const runNext = () => {
        while (
          !this.cancelled &&
          running < this.concurrency &&
          index < this.tasks.length
        ) {
          const currentIndex = index++;
          running++;

          const taskPromise = this.tasks[currentIndex]();
          this.runningTasks.add(taskPromise);

          taskPromise
            .then((result) => {
              if (!this.cancelled) {
                results[currentIndex] = { success: true, value: result };
              }
            })
            .catch((error) => {
              if (!this.cancelled) {
                results[currentIndex] = { success: false, error };
              }
            })
            .finally(() => {
              this.runningTasks.delete(taskPromise);
              running--;
              completed++;

              if (completed === originalLength) {
                complete();
              } else if (!this.cancelled) {
                runNext();
              } else if (running === 0) {
                complete();
              }
            });
        }
      };

      runNext();
    });
  }
}

// 使用示例
const asyncTask = (id: number, delay: number): Promise<string> => {
  return new Promise((resolve) => {
    console.log(`任务 ${id} 开始`);
    setTimeout(() => {
      console.log(`任务 ${id} 完成`);
      resolve(`结果 ${id}`);
    }, delay);
  });
};

const tasks = [
  () => asyncTask(1, 1000),
  () => asyncTask(2, 500),
  () => asyncTask(3, 2000),
  () => asyncTask(4, 300),
  () => asyncTask(5, 1500),
];

// 使用示例
// async function example() {
//   const controller = new MapLimitController(tasks, 2, () => {
//     console.log('Callback: 所有任务完成或被取消');
//   });

//   const promise = controller.run();

//   // 模拟在 1 秒后取消
//   setTimeout(() => {
//     console.log('正在取消...');
//     controller.cancel();
//   }, 800);

//   try {
//     const { results, cancelled } = await promise;
//     console.log('执行完成:', {
//       results,
//       cancelled,
//       completedCount: results.filter(r => r !== undefined).length
//     });
//   } catch (error) {
//     console.error('执行出错:', error);
//   }
// }

// example();