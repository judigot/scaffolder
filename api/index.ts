import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import router from '../src/routes/index.ts';

dotenv.config();

const app = express();

app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

app.use(router);

export default app;
