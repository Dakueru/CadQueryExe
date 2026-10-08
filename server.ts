import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync, ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Active execution process map for cancellation
const activeExecutions = new Map<string, ChildProcess>();

// Health check and environment probe
app.get('/api/cadquery/health', (req, res) => {
  try {
    const pythonCheck = spawn('python3', [path.join(__dirname, 'backend', 'cadquery_runner.py'), '--check']);
    let stdout = '';
    let stderr = '';

    pythonCheck.stdout.on('data', (d) => { stdout += d.toString(); });
    pythonCheck.stderr.on('data', (d) => { stderr += d.toString(); });

    pythonCheck.on('close', (code) => {
      let envData: any = {};
      try {
        envData = JSON.parse(stdout);
      } catch {
        envData = { raw: stdout, stderr };
      }

      res.json({
        status: 'online',
        arch: os.arch(),
        platform: os.platform(),
        cpus: os.cpus().length,
        memoryFreeMb: Math.round(os.freemem() / 1024 / 1024),
        pythonEnvironment: envData
      });
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Execute CadQuery Python script
app.post('/api/cadquery/execute', async (req, res) => {
  const { code, executionId } = req.body;
  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Falta el código de Python a ejecutar.' });
  }

  const id = executionId || `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const runnerScript = path.join(__dirname, 'backend', 'cadquery_runner.py');

  const pyProcess = spawn('python3', [runnerScript]);
  activeExecutions.set(id, pyProcess);

  let stdout = '';
  let stderr = '';
  let timedOut = false;

  // Timeout guard (60 seconds)
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      pyProcess.kill('SIGKILL');
    } catch {}
  }, 60000);

  pyProcess.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  pyProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  pyProcess.on('error', (err) => {
    clearTimeout(timer);
    activeExecutions.delete(id);
    res.status(500).json({
      success: false,
      error: `Error al iniciar el proceso de Python: ${err.message}`,
      stdout: '',
      objects: []
    });
  });

  pyProcess.on('close', (exitCode) => {
    clearTimeout(timer);
    activeExecutions.delete(id);

    if (timedOut) {
      return res.status(408).json({
        success: false,
        error: 'El tiempo de ejecución ha superado el límite de 60 segundos (Timeout).',
        stdout,
        objects: []
      });
    }

    try {
      const parsed = JSON.parse(stdout);
      return res.json({
        ...parsed,
        executionId: id
      });
    } catch (parseErr) {
      return res.json({
        success: false,
        error: stdout ? `Respuesta no estructurada: ${stdout}` : `Proceso terminado con código ${exitCode}. Error: ${stderr}`,
        stderr,
        stdout,
        objects: []
      });
    }
  });

  // Write payload to stdin
  pyProcess.stdin.write(JSON.stringify({ code }));
  pyProcess.stdin.end();
});

// Abort active execution
app.post('/api/cadquery/abort', (req, res) => {
  const { executionId } = req.body;
  if (executionId && activeExecutions.has(executionId)) {
    const proc = activeExecutions.get(executionId);
    try {
      proc?.kill('SIGKILL');
      activeExecutions.delete(executionId);
      return res.json({ aborted: true, executionId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Kill all active if none specified
  activeExecutions.forEach((proc, key) => {
    try { proc.kill('SIGKILL'); } catch {}
  });
  activeExecutions.clear();
  res.json({ aborted: true, all: true });
});

// Export 3D CAD model
app.post('/api/cadquery/export', async (req, res) => {
  const { code, format, filename } = req.body;
  const allowed = ['step', 'stl', 'amf', 'svg'];
  const fmt = (format || 'step').toLowerCase();

  if (!allowed.includes(fmt)) {
    return res.status(400).json({ error: `Formato no soportado: ${fmt}. Permitidos: ${allowed.join(', ')}` });
  }

  const tmpDir = os.tmpdir();
  const safeBaseName = (filename || 'modelo_cad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outPath = path.join(tmpDir, `${safeBaseName}_${Date.now()}.${fmt}`);
  const runnerScript = path.join(__dirname, 'backend', 'cadquery_runner.py');

  const pyProcess = spawn('python3', [runnerScript]);
  let stdout = '';
  let stderr = '';

  pyProcess.stdout.on('data', (d) => { stdout += d.toString(); });
  pyProcess.stderr.on('data', (d) => { stderr += d.toString(); });

  pyProcess.on('close', (code) => {
    if (fs.existsSync(outPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${safeBaseName}.${fmt}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      const stream = fs.createReadStream(outPath);
      stream.pipe(res);
      stream.on('end', () => {
        try { fs.unlinkSync(outPath); } catch {}
      });
    } else {
      let errDetail = 'No se pudo generar el archivo de exportación.';
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) errDetail = parsed.error;
      } catch {}
      res.status(500).json({ error: errDetail, stderr, stdout });
    }
  });

  pyProcess.stdin.write(JSON.stringify({
    code,
    export_format: fmt,
    export_path: outPath
  }));
  pyProcess.stdin.end();
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CadQuery Mobile Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
