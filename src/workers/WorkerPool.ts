export class WorkerPool {
  constructor(size: number) {}

  execute(task: any): Promise<any> {
    return Promise.resolve();
  }

  terminate(): void {}
}
