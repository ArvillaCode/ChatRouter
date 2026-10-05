import { createMcpExpressApp } from '@modelcontextprotocol/express'
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node'
import { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'

const PORT = Number(process.env.PORT || 8081)
const COOLIFY_BASE_URL = (process.env.COOLIFY_BASE_URL || '').replace(/\/$/, '')
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN || ''
const MCP_SHARED_SECRET = process.env.MCP_SHARED_SECRET || ''

if (!COOLIFY_BASE_URL) throw new Error('COOLIFY_BASE_URL is required')
if (!COOLIFY_API_TOKEN) throw new Error('COOLIFY_API_TOKEN is required')
if (!MCP_SHARED_SECRET) throw new Error('MCP_SHARED_SECRET is required')

async function coolifyGet(path: string) {
  const res = await fetch(`${COOLIFY_BASE_URL}/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(20000)
  })

  const text = await res.text()
  let body: unknown
  try { body = text ? JSON.parse(text) : null } catch { body = text }

  if (!res.ok) {
    throw new Error(`Coolify API ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  }
  return body
}

function result(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: typeof data === 'object' && data !== null
      ? { data }
      : { value: data }
  }
}

function buildServer() {
  const server = new McpServer({
    name: 'coolify-readonly',
    version: '1.0.0'
  })

  const readonly = { readOnlyHint: true, openWorldHint: false }

  server.registerTool(
    'coolify_health',
    {
      title: 'Coolify Health',
      description: 'Check whether the Coolify API is reachable. Read-only.',
      annotations: readonly
    },
    async () => result(await coolifyGet('/health'))
  )

  server.registerTool(
    'list_projects',
    {
      title: 'List Coolify Projects',
      description: 'List projects visible to the configured Coolify team. Read-only.',
      annotations: readonly
    },
    async () => result(await coolifyGet('/projects'))
  )

  server.registerTool(
    'list_applications',
    {
      title: 'List Coolify Applications',
      description: 'List applications visible to the configured Coolify team. Read-only.',
      inputSchema: z.object({
        tag: z.string().optional().describe('Optional Coolify tag filter')
      }),
      annotations: readonly
    },
    async ({ tag }) => {
      const qs = tag ? `?tag=${encodeURIComponent(tag)}` : ''
      return result(await coolifyGet(`/applications${qs}`))
    }
  )

  server.registerTool(
    'get_application',
    {
      title: 'Get Coolify Application',
      description: 'Inspect one Coolify application by UUID. Read-only.',
      inputSchema: z.object({
        uuid: z.string().min(1)
      }),
      annotations: readonly
    },
    async ({ uuid }) => result(await coolifyGet(`/applications/${encodeURIComponent(uuid)}`))
  )

  server.registerTool(
    'list_deployments',
    {
      title: 'List Coolify Deployments',
      description: 'List current/running Coolify deployments. Read-only.',
      annotations: readonly
    },
    async () => result(await coolifyGet('/deployments'))
  )

  server.registerTool(
    'list_servers',
    {
      title: 'List Coolify Servers',
      description: 'List servers visible to the configured Coolify team. Read-only.',
      annotations: readonly
    },
    async () => result(await coolifyGet('/servers'))
  )

  server.registerTool(
    'list_services',
    {
      title: 'List Coolify Services',
      description: 'List Docker Compose / multi-container services. Read-only.',
      annotations: readonly
    },
    async () => result(await coolifyGet('/services'))
  )

  server.registerTool(
    'get_service',
    {
      title: 'Get Coolify Service',
      description: 'Inspect one Coolify service by UUID. Read-only.',
      inputSchema: z.object({
        uuid: z.string().min(1)
      }),
      annotations: readonly
    },
    async ({ uuid }) => result(await coolifyGet(`/services/${encodeURIComponent(uuid)}`))
  )

  server.registerTool(
    'list_service_databases',
    {
      title: 'List Service Databases',
      description: 'List database components for one Coolify service. Read-only.',
      inputSchema: z.object({
        uuid: z.string().min(1).describe('Service UUID')
      }),
      annotations: readonly
    },
    async ({ uuid }) => result(await coolifyGet(`/services/${encodeURIComponent(uuid)}/databases`))
  )

  server.registerTool(
    'list_service_tags',
    {
      title: 'List Service Tags',
      description: 'List tags attached to one Coolify service. Read-only.',
      inputSchema: z.object({
        uuid: z.string().min(1).describe('Service UUID')
      }),
      annotations: readonly
    },
    async ({ uuid }) => result(await coolifyGet(`/services/${encodeURIComponent(uuid)}/tags`))
  )

  return server
}

const app = createMcpExpressApp({ host: '0.0.0.0' })

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, service: 'coolify-readonly-mcp' })
})

app.use('/mcp', (req, res, next) => {
  const expected = `Bearer ${MCP_SHARED_SECRET}`
  if (req.header('authorization') !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

app.post('/mcp', async (req, res) => {
  const server = buildServer()
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  })

  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } finally {
    await transport.close().catch(() => undefined)
    await server.close().catch(() => undefined)
  }
})

app.get('/mcp', (_req, res) => {
  res.status(405).json({ error: 'GET not supported in stateless mode' })
})

app.delete('/mcp', (_req, res) => {
  res.status(405).json({ error: 'DELETE not supported in stateless mode' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Coolify read-only MCP listening on 0.0.0.0:${PORT}`)
})
