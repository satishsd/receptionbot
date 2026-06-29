import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import chatRoutes from './channels/web/chatRoutes';
import adminRoutes from './channels/admin/adminRoutes';
import whatsappWebhookRoutes from './channels/whatsapp/webhookRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'receptionbot', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhook/whatsapp', whatsappWebhookRoutes);

// Serve static frontend (must come after API routes)
app.use(express.static(path.join(process.cwd(), 'public')));

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
