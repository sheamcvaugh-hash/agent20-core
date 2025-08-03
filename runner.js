import { processNextEntry } from './processQueue.js';

(async () => {
  console.log('🚀 Running Agent 20 queue processor...');
  await processNextEntry();
})();
