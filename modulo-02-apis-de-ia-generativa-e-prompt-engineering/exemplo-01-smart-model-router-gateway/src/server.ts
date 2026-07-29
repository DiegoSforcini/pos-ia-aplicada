import Fastify from 'fastify';
import { OpenRouterService } from './openRouterService.ts';

export const createServer = (routerService: OpenRouterService) => {
  const app = Fastify({
    logger: false,
  });

  app.post('/chat', {
    schema: {
        body: {
            type: 'object',
            required: ['question'],
            properties: {
                question: { type: 'string', minLength: 5 },
            }
        }
    }
  }, async (request, reply) => {
    try {
        const { question } = request.body as { question: string };
        const response = await routerService.generate(question);
        reply.send(response);
    } catch (error) {
        console.error('Error handling /chat requests:', error);
        reply.status(500).send({ error: 'An error occurred while processing your request.' });
    }
  });

  app.get('/', async (request, reply) => {
    return { message: 'Hello, World!' };
  });

  return app;
};