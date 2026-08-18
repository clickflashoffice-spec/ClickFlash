import { parentPort } from 'worker_threads';
import { aiGradeWorker } from './ai-grade-worker';

if (parentPort) {
  parentPort.on('message', async (task) => {
    try {
      if (task.type === 'GRADE_PHOTO') {
        const result = await aiGradeWorker.gradePhoto(task.filePath, task.photoId, task.galleryId, task.options);
        parentPort?.postMessage({ taskId: task.taskId, success: true, result });
      }
    } catch (err: any) {
      parentPort?.postMessage({ taskId: task.taskId, success: false, error: err.message });
    }
  });
}
