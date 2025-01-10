import { Component, OnInit } from '@angular/core';
import { toast } from 'ngx-sonner';
import { IpcRendererEvent } from 'electron';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, data: any) => void,
        on: (channel: string, func: (event: IpcRendererEvent, ...args: any[]) => void) => void,
      };
    }
  }
}

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  styleUrls: ['./turnos.component.scss'],
})
export default class TurnosComponent implements OnInit {
  turnosNormal = 0;
  turnosTercera = 0;
  turnosDelDia: string[] = [];
  currentDate: string = '';
  lastResetDate: string = '';

  constructor() {}

  ngOnInit() {
    this.updateDate();
    this.loadTurnsFromStorage();
    this.checkForReset();

    window.electron.ipcRenderer.on('print-status', (event: IpcRendererEvent, status: string, message: string) => {
      if (status === 'success') {
        toast.success('Ticket enviado a la impresora.');
      } else {
        toast.error(`No se pudo imprimir el ticket. ${message}`);
      }
    });

    window.electron.ipcRenderer.on('pdf-generated', (event: IpcRendererEvent, pdfPath: string) => {
      const confirmed = confirm('¿Deseas imprimir el ticket?');
      if (confirmed) {
        window.electron.ipcRenderer.send('print-ticket', pdfPath);
      }
    });
  }

  updateDate() {
    const today = new Date();
    this.currentDate = today.toLocaleDateString('es-EC');
  }

  handleTurn(type: 'normal' | 'tercera') {
    const date = new Date().toLocaleDateString('es-EC');
    const secuencial = type === 'normal' ? `N${this.turnosNormal + 1}` : `E${this.turnosTercera + 1}`;

    const turno = [
      'GADMM La Libertad',
      '',
      `TURNO ${type === 'normal' ? 'NORMAL' : '3ERA EDAD'}`,
      '',
      secuencial,
      '',
      `FECHA: ${date}`,
      '',
      'LA LIBERTAD'
    ].join('\n');

    this.turnosDelDia.push(turno);
    type === 'normal' ? this.turnosNormal++ : this.turnosTercera++;
    this.saveTurnsToStorage();

    this.generatePDF(turno);
    toast.success('Turno generado correctamente');
  }

  checkForReset() {
    const today = new Date().toLocaleDateString('es-EC');
    if (this.lastResetDate !== today) {
      this.resetTurns();
      this.lastResetDate = today;
      this.saveTurnsToStorage();
    }
  }

  saveTurnsToStorage() {
    const turnsData = {
      turnosNormal: this.turnosNormal,
      turnosTercera: this.turnosTercera,
      turnosDelDia: this.turnosDelDia,
      lastResetDate: this.lastResetDate,
    };
    localStorage.setItem('turnosData', JSON.stringify(turnsData));
  }

  loadTurnsFromStorage() {
    const storedData = localStorage.getItem('turnosData');
    if (storedData) {
      const { turnosNormal, turnosTercera, turnosDelDia, lastResetDate } = JSON.parse(storedData);
      this.turnosNormal = turnosNormal || 0;
      this.turnosTercera = turnosTercera || 0;
      this.turnosDelDia = turnosDelDia || [];
      this.lastResetDate = lastResetDate || '';
    }
  }

  resetTurns() {
    this.turnosNormal = 0;
    this.turnosTercera = 0;
    this.turnosDelDia = [];
    toast.info('Turnos reiniciados automáticamente.');
  }

  printReport() {
    const password = window.prompt('Por favor, ingrese la contraseña para imprimir el informe:');
    const correctPassword = '1234';

    if (password === correctPassword) {
      const report = `
Conteo de Turnos:
Normales: ${this.turnosNormal}
3era Edad: ${this.turnosTercera}

Turnos Generados:
${this.turnosDelDia.join('\n\n')}
      `;
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `reporte_turnos_${new Date().toLocaleDateString('es-EC').replace(/\//g, '-')}.txt`;
      link.click();
      toast.success('Informe descargado exitosamente.');
    } else {
      toast.error('Contraseña incorrecta. No se pudo generar el informe.');
    }
  }

  generatePDF(content: string) {
    try {
      console.log('Generando PDF para previsualización:', content);
      window.electron.ipcRenderer.send('generate-ticket', content);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      toast.error('No se pudo generar el PDF.');
    }
  }
}
