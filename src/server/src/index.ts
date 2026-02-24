import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';
import { authenticate } from './middleware/authenticate';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/tasks', authenticate, tasksRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
