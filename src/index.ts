import 'dotenv/config';
import { createApp } from './server/app.js';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`[Manova Labs] Server running on http://localhost:${port}`);
  console.log(`[Manova Labs] Operational health: http://localhost:${port}/health`);
  console.log(`[Manova Labs] Researcher API: http://localhost:${port}/api/v1/experiments`);
});
