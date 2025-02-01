const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const pdfToPrinter = require('pdf-to-printer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { session } = require('electron');

app.on('ready', () => {
  session.defaultSession.clearCache().then(() => {
    console.log('Caché de Electron limpiada');
  });
});

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
  /*win.loadURL('http://localhost:4200');*/
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

// Handler for saving reports
ipcMain.on('save-report', async (event, content) => {
  try {
    const documentsPath = app.getPath('documents');
    const today = new Date().toLocaleDateString('es-EC').replace(/\//g, '_');
    const reportFileName = `reporte_turnos_${today}.txt`;
    const reportFilePath = path.join(documentsPath, reportFileName);

    let fileExists = fs.existsSync(reportFilePath);
    if (!fileExists) {
      fs.writeFileSync(reportFilePath, 'Reporte de Turnos\n=================\n');
    }

    fs.writeFileSync(reportFilePath, content); // Sobrescribir en lugar de append
    console.log(`Informe actualizado en: ${reportFilePath}`);
    event.sender.send('save-report-status', 'success', `Informe actualizado exitosamente en: ${reportFilePath}`);
  } catch (error) {
    console.error(`Error al guardar el informe: ${error.message}`);
    event.sender.send('save-report-status', 'error', `Error inesperado: ${error.message}`);
  }
});

// New handler for loading reports
ipcMain.on('load-report', (event) => {
  try {
    const documentsPath = app.getPath('documents');
    const today = new Date().toLocaleDateString('es-EC').replace(/\//g, '_');
    const reportFileName = `reporte_turnos_${today}.txt`;
    const reportFilePath = path.join(documentsPath, reportFileName);

    if (fs.existsSync(reportFilePath)) {
      const reportContent = fs.readFileSync(reportFilePath, 'utf8');
      event.sender.send('load-report-status', 'success', reportContent);
    } else {
      // If file doesn't exist, send initial state
      const initialContent = `Reporte de Turnos\n=================\n\nFecha: ${new Date().toLocaleDateString('es-EC')}\n--------------------------\nConteo de Turnos:\nNormales: 0\n3era Edad: 0\nTotal de Turnos: 0\n\nTurnos Generados:\n`;
      fs.writeFileSync(reportFilePath, initialContent);
      event.sender.send('load-report-status', 'success', initialContent);
    }
  } catch (error) {
    console.error(`Error al cargar el reporte: ${error.message}`);
    event.sender.send('load-report-status', 'error', error.message);
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
        doc.font('Helvetica-Bold').fontSize(50).text(line, {
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

ipcMain.on('generate-ticket-for-report', async (event, content) => {
  try {
    const width = 3.125 * 72;
    const height = 230 * 72;
    const doc = new PDFDocument({ size: [width, height], margin: 10 });
    const pdfPath = path.join(app.getPath('temp'), 'ticket_for_report.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const lines = content.split('\n');
    lines.forEach(line => {
      if (/Normales: \d+|3era Edad: \d+|Total de Turnos: \d+/.test(line)) {
        doc.font('Helvetica').fontSize(20).text(line, {
          align: 'center',
          width: width - 20,
        }).moveDown(0.5);
      } else {
        doc.font('Helvetica-Bold').fontSize(20).text(line, {
          align: 'center',
          width: width - 20,
        }).moveDown(0.5);
      }
    });

    doc.end();
    writeStream.on('finish', async () => {
      await pdfToPrinter.print(pdfPath);
      console.log('Impresión de reporte exitosa');
      event.sender.send('print-status', 'success', 'Impresión de reporte exitosa');
      fs.unlinkSync(pdfPath);
    });
  } catch (error) {
    console.error(`Error inesperado al generar el PDF: ${error.message}`);
    event.sender.send('print-status', 'error', `Error inesperado: ${error.message}`);
  }
});

// Handler for saving total daily turns in a monthly file
ipcMain.on('save-total-turns', async (event, totalTurns) => {
  try {
    const documentsPath = app.getPath('documents');
    const now = new Date();
    const monthName = now.toLocaleString('es-EC', { month: 'long' });
    const year = now.getFullYear();
    const today = now.toLocaleDateString('es-EC').replace(/\//g, '_');
    const totalFileName = `Total_Mes_${monthName}_${year}.txt`;
    const totalFilePath = path.join(documentsPath, totalFileName);

    let existingContent = '';
    let monthTotal = 0;
    let dailyTotals = {};

    // Check if the file exists and read its content
    if (fs.existsSync(totalFilePath)) {
      existingContent = fs.readFileSync(totalFilePath, 'utf8');
      const lines = existingContent.split('\n');

      // Extract the existing month total and daily totals
      for (const line of lines) {
        if (line.startsWith('Total Mes:')) {
          monthTotal = parseInt(line.split(': ')[1], 10);
        } else if (line.includes(': ')) {
          const [date, total] = line.split(': ');
          dailyTotals[date] = parseInt(total, 10);
        }
      }
    }

    // Update the daily total for the current day
    dailyTotals[today] = totalTurns;

    // Recalculate the month total
    monthTotal = Object.values(dailyTotals).reduce((sum, dailyTotal) => sum + dailyTotal, 0);

    // Construct the new content
    let newContent = `Total Mes: ${monthTotal}\n`;
    for (const [date, total] of Object.entries(dailyTotals)) {
      newContent += `${date}: ${total}\n`;
    }

    // Write the updated content to the file
    fs.writeFileSync(totalFilePath, newContent);
    console.log(`Total de turnos guardado en: ${totalFilePath}`);
    event.sender.send('save-total-turns-status', 'success', `Total de turnos guardado en: ${totalFilePath}`);
  } catch (error) {
    console.error(`Error al guardar el total de turnos: ${error.message}`);
    event.sender.send('save-total-turns-status', 'error', `Error inesperado: ${error.message}`);
  }
});
