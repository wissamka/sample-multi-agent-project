import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';
import profileRouter from './routes/profile';
import inboxRouter from './routes/inbox';
import rulesRouter from './routes/rules';
import memoriesRouter from './routes/memories';
import contactsRouter from './routes/contacts';
import eventsRouter from './routes/events';
import actionsRouter from './routes/actions';
import briefRouter from './routes/brief';
import { authenticate } from './middleware/authenticate';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/tasks', authenticate, tasksRouter);
app.use('/profile', authenticate, profileRouter);
app.use('/inbox', authenticate, inboxRouter);
app.use('/rules', authenticate, rulesRouter);
app.use('/memories', authenticate, memoriesRouter);
app.use('/contacts', authenticate, contactsRouter);
app.use('/events', authenticate, eventsRouter);
app.use('/actions', authenticate, actionsRouter);
app.use('/brief', authenticate, briefRouter);

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
