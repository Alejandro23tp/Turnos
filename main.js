const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const pdfToPrinter = require('pdf-to-printer');
const fs = require('fs');
const PDFDocument = require('pdfkit');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  win.loadURL('http://localhost:4200');
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

ipcMain.on('generate-ticket', async (event, content) => {
  try {
    // Crear un documento PDF con ajuste de tamaño de página adecuado para impresoras térmicas
    const doc = new PDFDocument({ size: [200, 80 * 2.83465], margin: 8})
    //const doc = new PDFDocument({ size: [80 * 2.83465, 200], margin: 10 }); // Tamaño ajustado para impresoras térmicas
    const pdfPath = path.join(app.getPath('temp'), 'ticket.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Añadir contenido al PDF con ajuste de ancho
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(content, {
      align: 'center',
      width: 80 * 2.83465 - 20, // Ajustar el ancho del contenido restando el margen
    });
    doc.end();

    // Esperar a que el PDF se haya escrito en el sistema de archivos
    writeStream.on('finish', async () => {
      // Abrir el archivo PDF para previsualización
      shell.openPath(pdfPath);
      event.sender.send('pdf-generated', pdfPath);
    });

  } catch (error) {
    console.error(`Error inesperado al generar el PDF: ${error.message}`);
    event.sender.send('print-status', 'error', `Error inesperado: ${error.message}`);
  }
});

ipcMain.on('print-ticket', async (event, pdfPath) => {
  try {
    // Imprimir el archivo PDF
    await pdfToPrinter.print(pdfPath);

    console.log('Impresión exitosa');
    event.sender.send('print-status', 'success', 'Impresión exitosa');

    // Eliminar el archivo PDF temporal
    fs.unlinkSync(pdfPath);

  } catch (error) {
    console.error(`Error inesperado al ejecutar impresión: ${error.message}`);
    event.sender.send('print-status', 'error', `Error inesperado: ${error.message}`);
  }
});
