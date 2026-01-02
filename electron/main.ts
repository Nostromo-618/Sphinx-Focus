import { app, BrowserWindow, protocol } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

function setupProtocol() {
  // Handle custom app:// protocol to serve files from asar
  protocol.handle('app', async (request) => {
    // In packaged app, resources are in app.asar.unpacked or app.asar
    // In development, they're relative to the project root
    let basePath: string

    if (app.isPackaged) {
      // In packaged app, static files are unpacked to app.asar.unpacked
      basePath = path.join(process.resourcesPath, 'app.asar.unpacked', '.output', 'public')
    } else {
      // In development, use app path
      basePath = path.join(app.getAppPath(), '.output', 'public')
    }

    // Parse the URL and remove query parameters
    const url = new URL(request.url)
    let filePath = decodeURIComponent(url.pathname)

    // Remove leading slash
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1)
    }

    // Handle directory requests - if path ends with / or is empty, serve index.html
    if (filePath === '' || filePath.endsWith('/')) {
      filePath = 'index.html'
    }

    // Handle payload requests - Nuxt uses _payload.json with a hash query param
    // The actual file is in builds/meta/{hash}.json
    if (filePath === '_payload.json' && url.searchParams.size > 0) {
      const hash = Array.from(url.searchParams.keys())[0]
      filePath = `builds/meta/${hash}.json`
    }

    const fullPath = path.join(basePath, filePath)

    try {
      const data = readFileSync(fullPath)
      const ext = path.extname(fullPath).toLowerCase()

      // Determine MIME type based on file extension
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject'
      }

      const mimeType = mimeTypes[ext] || 'application/octet-stream'

      return new Response(data, {
        headers: {
          'Content-Type': mimeType
        }
      })
    } catch (error) {
      console.error('Failed to load file:', fullPath, error)
      return new Response('File not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true // Re-enabled - using custom protocol instead
    },
    titleBarStyle: 'hiddenInset', // macOS native look
    title: 'Sphinx Focus'
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // Use custom app:// protocol to load files from asar
    // This works with webSecurity enabled
    // Load from root path so Nuxt router works correctly
    win.loadURL('app://.')
  }

  if (!app.isPackaged) {
    win.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  setupProtocol()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

