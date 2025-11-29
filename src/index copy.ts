// import express, { type Request, type Response } from 'express';
// import cors from 'cors';
// import compression from 'compression';
// import path from 'node:path';
// import dotenv from 'dotenv';
// import process from 'node:process';
// import router from '@/app/routes/index.ts';

// dotenv.config();

// const app = express();
// const isProduction: boolean = process.env.NODE_ENV === 'production';
// const PORT = process.env.VITE_BACKEND_PORT ?? '3000';
// const platform: string = process.platform;
// let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

// if (platform === 'win32') {
//   __dirname = __dirname.substring(1);
// }

// const publicDirectory = isProduction
//   ? path.join(__dirname, '..', 'dist')
//   : path.join(__dirname, 'public');

// const startServer = async (): Promise<void> => {
//   app.use(compression());
//   app.use(express.json({ limit: '100mb' }));
//   app.use(express.urlencoded({ limit: '100mb', extended: true }));
//   app.use(cors());

//   app.use('/api', router);

//   if (isProduction) {
//     app.use(express.static(publicDirectory));
//     app.get('*', (_req: Request, res: Response) => {
//       res.sendFile(path.join(publicDirectory, 'index.html'));
//     });
//   } else {
//     type ViteModule = typeof import('vite');
//     const viteModule: ViteModule = await import('vite');
//     const vite = await viteModule.createServer({
//       configFile: path.resolve(__dirname, '../vite.config.ts'),
//       server: { middlewareMode: true },
//       appType: 'spa',
//     });
//     app.use(vite.middlewares);
//   }

//   app.listen(PORT, () => {
//     // eslint-disable-next-line no-console
//     console.log(
//       `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on ${process.env.VITE_BACKEND_HOST ?? 'localhost'}:${PORT}`,
//     );
//   });
// };

// void startServer();

// export default app;
