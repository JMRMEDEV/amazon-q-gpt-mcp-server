# GPT Agent MCP Server

An MCP server that provides a ChatGPT agent specialized in software architecture, full-stack development, and code debugging.

## Features

- **Specialized Agent**: Focused on software development, architecture, and debugging
- **Real Web Search**: DuckDuckGo integration for live search results
- **Conversation Memory**: Maintains context across interactions
- **Attempt Tracking**: Monitors failed solutions to trigger web search automatically
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

## Web Search Integration

The agent includes real web search functionality powered by DuckDuckGo that triggers:
- **Version Checks**: When asking about current versions, latest releases, or updates
- **API Documentation**: When requesting API docs, references, or endpoints  
- **Failed Attempts**: After 3 unsuccessful solution attempts on the same topic

The search provides live results including titles, URLs, and snippets from DuckDuckGo, giving the agent access to current information for better responses.

**Benefits of DuckDuckGo Integration:**
- No API keys required (completely free)
- No rate limiting or bot detection issues
- Privacy-focused search without tracking
- Reliable results for development topics
- Automatic fallback to simulated results if search fails

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
