const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Habilitado para seguridad
      enableRemoteModule: false, // Deshabilitado para seguridad
      nodeIntegration: false, // Usando contextBridge
    },
  });

  win.loadURL('http://localhost:4200'); // O usa win.loadFile('dist/tu-proyecto/index.html'); si está construido
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('print-ticket', (event, content) => {
  try {
    const printerName = 'Star TSP100 Cutter (TSP143)'; // Reemplaza con el nombre exacto de tu impresora
    const scriptPath = "C:\\Users\\Administrador\\Desktop\\Pasantias\\turnos\\print.ps1"; // Ruta absoluta

    console.log(`Script Path: ${scriptPath}`);
    console.log(`Content to Print: ${content}`);

    if (!content || typeof content !== 'string') {
      const errorMessage = 'El contenido a imprimir está vacío o no es válido.';
      console.error(errorMessage);
      event.sender.send('print-status', 'error', errorMessage);
      return;
    }

    execFile('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-printerName', printerName,
      '-content', content
    ], (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al imprimir: ${error.message}`);
        event.sender.send('print-status', 'error', `Error al imprimir: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        event.sender.send('print-status', 'error', `stderr: ${stderr}`);
        return;
      }
      console.log(`Impresión exitosa: ${stdout}`);
      event.sender.send('print-status', 'success', `Impresión exitosa: ${stdout}`);
    });
  } catch (error) {
    console.error(`Error inesperado al ejecutar impresión: ${error.message}`);
    event.sender.send('print-status', 'error', `Error inesperado: ${error.message}`);
  }
});
