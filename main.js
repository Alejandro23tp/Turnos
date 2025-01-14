const { app, BrowserWindow, ipcMain } = require('electron');
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

  win.loadURL('http://localhost/angular/dist/turnos/browser');
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

ipcMain.on('save-report', async (event, content) => {
  try {
    // Obtener la ruta de la carpeta "Documentos" del usuario
    const documentsPath = app.getPath('documents');
    const reportFileName = 'reporte_turnos.txt';  // Usamos un solo archivo de texto
    const reportFilePath = path.join(documentsPath, reportFileName);

    // Si el archivo existe, agregamos el nuevo reporte; si no, lo creamos
    const today = new Date().toLocaleDateString('es-EC');
    let reportHeader = `\n\nFecha: ${today}\n--------------------------\n`;

    // Verificamos si el archivo ya existe
    let fileExists = fs.existsSync(reportFilePath);
    if (!fileExists) {
      // Si el archivo no existe, creamos uno nuevo
      fs.writeFileSync(reportFilePath, 'Reporte de Turnos\n=================\n');
    }

    // Escribimos el contenido del reporte al archivo
    fs.appendFileSync(reportFilePath, reportHeader + content); // Se añade el reporte

    console.log(`Informe actualizado en: ${reportFilePath}`);
    event.sender.send('save-report-status', 'success', `Informe actualizado exitosamente en: ${reportFilePath}`);

  } catch (error) {
    console.error(`Error al guardar el informe: ${error.message}`);
    event.sender.send('save-report-status', 'error', `Error inesperado: ${error.message}`);
  }
});


ipcMain.on('generate-ticket', async (event, content) => {
  try {
    const width = 3.125 * 72;
    const height = 230 * 72;

    const doc = new PDFDocument({ size: [width, height], margin: 10 });
    const pdfPath = path.join(app.getPath('temp'), 'ticket.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const lines = content.split('\n');
    lines.forEach(line => {
      if (/N\d+|E\d+/.test(line)) {
        doc.font('Helvetica-Bold').fontSize(28).text(line, {
          align: 'center',
          width: width - 20,
        }).moveDown(0.5);
      } else {
        doc.font('Helvetica').fontSize(14).text(line, {
          align: 'center',
          width: width - 20,
        }).moveDown(0.5);
      }
    });

    doc.end();

    writeStream.on('finish', async () => {
      await pdfToPrinter.print(pdfPath);
      console.log('Impresión exitosa');
      event.sender.send('print-status', 'success', 'Impresión exitosa');
      fs.unlinkSync(pdfPath);
    });

  } catch (error) {
    console.error(`Error inesperado al generar el PDF: ${error.message}`);
    event.sender.send('print-status', 'error', `Error inesperado: ${error.message}`);
  }
});





