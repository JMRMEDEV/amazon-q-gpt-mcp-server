# GPT Agent MCP Server

An MCP server that provides a ChatGPT agent specialized in software architecture, full-stack development, and code debugging.

## Features

- **Specialized Agent**: Focused on software development, architecture, and debugging
- **Simulated Web Search**: Triggers on version queries, API docs, or after 3 failed attempts
- **Conversation Memory**: Maintains context across interactions
- **Attempt Tracking**: Monitors failed solutions to trigger web search simulation
- **GPT-4o-mini**: Cost-efficient model optimized for development tasks
- **Three Core Tools**: Chat, reset conversation, and status checking

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Make executable:**
   ```bash
   chmod +x server.js
   ```

## Usage

### Available Tools

#### `chat_with_agent`
Chat with the software development agent.

**Parameters:**
- `message` (required): Your development question or request
- `context` (optional): Additional context about your project or environment

**Example:**
```json
{
  "message": "How should I structure a Node.js microservices architecture?",
  "context": "Building an e-commerce platform with high traffic requirements"
}
```

#### `reset_conversation`
Clear conversation history and attempt tracking.

#### `get_agent_status`
Get current agent status and conversation information.

## Web Search Simulation

The agent includes simulated web search functionality that triggers:
- **Version Checks**: When asking about current versions, latest releases, or updates
- **API Documentation**: When requesting API docs, references, or endpoints  
- **Failed Attempts**: After 3 unsuccessful solution attempts on the same topic

*Note: Currently uses simulated search results. Replace `performWebSearch()` method with actual web search API for real functionality.*

## Agent Capabilities

The agent specializes in:
- Software architecture and design patterns
- Full-stack development (frontend, backend, databases)
- Code debugging and optimization
- Technology stack recommendations
- Best practices and code review

## Amazon Q Integration

To use with Amazon Q, add this server to your MCP configuration:

```json
{
  "mcpServers": {
    "gpt": {
      "command": "node",
      "args": ["/home/jmrmedev/mcp-servers/gpt/server.js"],
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key-here"
      }
    }
  }
}
```

## Configuration

Environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OPENAI_MODEL`: Model to use (default: gpt-4o-mini)
- `DEBUG`: Enable debug logging (default: false)
