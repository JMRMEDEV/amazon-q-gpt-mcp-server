#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  InitializeRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

class GPTAgentServer {
  constructor() {
    this.debug('Initializing GPT Agent Server...');
    this.server = new Server(
      {
        name: 'gpt',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    this.debug('Server instance created');

    this.setupAgent();
    this.debug('Agent setup complete');
    this.setupToolHandlers();
    this.debug('Tool handlers setup complete');
    this.setupErrorHandling();
    this.debug('Error handling setup complete');
  }

  debug(message) {
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] ${message}`);
    }
  }

  setupAgent() {
    this.openai = null;
    this.conversationHistory = [];
    this.attemptTracker = new Map();
  }

  getOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  setupToolHandlers() {
    // Handle MCP initialization
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'gpt',
          version: '1.0.0'
        }
      };
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'chat_with_agent',
          description: 'Chat with the GPT agent focused on software development and architecture',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Your message to the software development agent'
              },
              context: {
                type: 'string',
                description: 'Optional context about your development environment or project'
              }
            },
            required: ['message']
          }
        },
        {
          name: 'reset_conversation',
          description: 'Reset the conversation history with the agent',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_agent_status',
          description: 'Get current agent status and conversation info',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'chat_with_agent':
            return await this.handleChat(args);
          case 'reset_conversation':
            return this.handleReset();
          case 'get_agent_status':
            return this.handleStatus();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async handleChat(args) {
    const { message, context } = args;
    
    // Check if web search should be triggered
    const topic = message.substring(0, 50);
    const attempts = this.attemptTracker.get(topic) || 0;
    const shouldUseWebSearch = this.shouldTriggerWebSearch(message, attempts);

    this.debug(`message="${message}", attempts=${attempts}, shouldUseWebSearch=${shouldUseWebSearch}`);

    // Build system message with web search capability
    let systemContent = `You are a Senior Software Architect and Full-Stack Developer with expertise in:
- Software architecture and design patterns
- Full-stack development (frontend, backend, databases)
- Code debugging and optimization
- Technology stack recommendations
- Best practices and code review

Focus ONLY on software development, architecture, and debugging topics. Provide practical, actionable solutions. Be concise but thorough.`;

    if (shouldUseWebSearch) {
      systemContent += `\n\nYou have access to current web information for this query. Use it to provide up-to-date information about versions, APIs, or solutions.`;
    }

    const systemMessage = { role: 'system', content: systemContent };

    // Build user message with context if provided
    let userContent = message;
    if (context) {
      userContent = `Context: ${context}\n\nQuestion: ${message}`;
    }

    // Add web search results if triggered
    if (shouldUseWebSearch) {
      const searchResults = await this.performWebSearch(message, attempts);
      userContent += `\n\nWeb Search Results: ${searchResults}`;
      this.debug('Added web search results to user content');
    }

    const userMessage = { role: 'user', content: userContent };

    // Build messages array
    const messages = [systemMessage];
    if (this.conversationHistory.length > 0) {
      messages.push(...this.conversationHistory);
    }
    messages.push(userMessage);

    try {
      const openai = this.getOpenAI();
      
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;

      // Update conversation history
      this.conversationHistory.push(userMessage);
      this.conversationHistory.push({ role: 'assistant', content: response });

      // Keep conversation history manageable
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-8);
      }

      // Reset attempt counter on success
      this.attemptTracker.delete(topic);

      return {
        content: [
          {
            type: 'text',
            text: response
          }
        ]
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);

      // Track failed attempts
      this.attemptTracker.set(topic, attempts + 1);

      let errorMessage = `OpenAI API Error: ${error.message}`;
      
      if (error.status === 401) {
        errorMessage = `Authentication failed. Please check your OpenAI API key.`;
      } else if (error.status === 429) {
        errorMessage = `Rate limit exceeded. Please try again later.`;
      } else if (error.status === 400) {
        errorMessage = `Bad request: ${error.message}`;
      }
      
      if (attempts + 1 >= 3) {
        errorMessage += `\n\nNote: This is attempt #${attempts + 1}. Web search will be used on next attempt.`;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ]
      };
    }
  }

  shouldTriggerWebSearch(message, attempts) {
    // Trigger web search for version checks
    const versionKeywords = ['version', 'latest', 'current', 'update', 'upgrade', 'new release'];
    const hasVersionKeyword = versionKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Trigger web search for API documentation
    const apiKeywords = ['api', 'documentation', 'docs', 'reference', 'endpoint'];
    const hasApiKeyword = apiKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Trigger web search after 3 failed attempts
    const failedAttempts = attempts >= 3;

    return hasVersionKeyword || hasApiKeyword || failedAttempts;
  }

  async performWebSearch(query, attempts) {
    // Determine search reason
    let reason = 'general';
    if (query.toLowerCase().includes('version') || query.toLowerCase().includes('latest')) {
      reason = 'version_check';
    } else if (query.toLowerCase().includes('api') || query.toLowerCase().includes('docs')) {
      reason = 'api_docs';
    } else if (attempts >= 3) {
      reason = 'failed_attempts';
    }

    // Simulate web search results (replace with actual web search API)
    const searchResults = `Current information found for "${query}" (${reason}): 
- Latest stable versions and best practices available
- Current API documentation and examples
- Recent community solutions and recommendations
- Updated compatibility information`;

    return searchResults;
  }

  handleReset() {
    this.conversationHistory = [];
    this.attemptTracker.clear();
    
    return {
      content: [
        {
          type: 'text',
          text: 'Conversation history reset successfully.'
        }
      ]
    };
  }

  handleStatus() {
    const historyLength = this.conversationHistory.length;
    const trackedTopics = this.attemptTracker.size;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    return {
      content: [
        {
          type: 'text',
          text: `Agent Status:
- Model: ${model}
- Conversation turns: ${historyLength}
- Tracked topics with attempts: ${trackedTopics}
- Agent focus: Software Architecture & Full-Stack Development`
        }
      ]
    };
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    try {
      this.debug('Starting GPT Agent MCP server...');
      const transport = new StdioServerTransport();
      this.debug('Transport created, connecting...');
      await this.server.connect(transport);
      this.debug('GPT Agent MCP server running on stdio');
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Validate environment - but don't exit, just warn
if (!process.env.OPENAI_API_KEY) {
  console.error('Warning: OPENAI_API_KEY environment variable not set');
}

// Export the class for testing
export { GPTAgentServer };

// Only run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new GPTAgentServer();
  server.run().catch(console.error);
}
