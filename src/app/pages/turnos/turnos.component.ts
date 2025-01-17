declare global {
  interface Window {
    electron: typeof Electron;
  }
}

import { Component, OnInit } from '@angular/core';
import { toast } from 'ngx-sonner';
import { IpcRendererEvent } from 'electron';
import { MatDialog } from '@angular/material/dialog';
import { PasswordDialogComponent } from '../../password-dialog/password-dialog.component';

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
  currentTime: string = '';

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    this.updateDate();
    this.loadTurnsFromFile();
    
    window.electron.ipcRenderer.on('print-status', (event: IpcRendererEvent, status: string, message: string) => {
      if (status === 'success') {
        toast.success('Ticket enviado a la impresora.');
      } else {
        toast.error(`No se pudo imprimir el ticket. ${message}`);
      }
    });

    window.electron.ipcRenderer.on('load-report-status', (event: IpcRendererEvent, status: string, data: string) => {
      if (status === 'success') {
        this.processLoadedReport(data);
      } else {
        toast.error('Error al cargar los datos del reporte.');
      }
    });

    setInterval(() => this.updateTime(), 1000);
  }

  loadTurnsFromFile() {
    window.electron.ipcRenderer.send('load-report', {});
  }

  processLoadedReport(reportContent: string) {
    try {
      // Extract turn counts
      const normalMatch = reportContent.match(/Normales: (\d+)/);
      const terceraMatch = reportContent.match(/3era Edad: (\d+)/);
      
      // Get date from report
      const dateMatch = reportContent.match(/Fecha: ([\d/]+)/);
      if (dateMatch) {
        const reportDate = dateMatch[1];
        const today = new Date().toLocaleDateString('es-EC');
        
        // Reset counts if it's a new day
        if (reportDate !== today) {
          this.resetTurns();
          return;
        }
        
        this.lastResetDate = reportDate;
      }

      // Set counts if found
      if (normalMatch) {
        this.turnosNormal = parseInt(normalMatch[1]);
      }
      if (terceraMatch) {
        this.turnosTercera = parseInt(terceraMatch[1]);
      }

      // Extract turns list
      const turnosSection = reportContent.split('Turnos Generados:')[1];
      if (turnosSection) {
        this.turnosDelDia = turnosSection
          .trim()
          .split('\n\n')
          .filter(turno => turno.trim().length > 0);
      }
    } catch (error) {
      console.error('Error al procesar el reporte:', error);
      toast.error('Error al procesar los datos del reporte.');
    }
  }

  updateDate() {
    const today = new Date();
    this.currentDate = today.toLocaleDateString('es-EC');
  }

  updateTime() {
    const now = new Date();
    this.currentDate = now.toLocaleDateString('es-EC');
    this.currentTime = now.toLocaleTimeString('es-EC');
  }

  handleTurn(type: 'normal' | 'tercera') {
    const date = new Date().toLocaleDateString('es-EC');
    const secuencial = type === 'normal' 
      ? `N${(this.turnosNormal + 1).toString().padStart(3, '0')}` 
      : `E${(this.turnosTercera + 1).toString().padStart(3, '0')}`;
  
    const turno = `
      GADM LA LIBERTAD
      ----------------
      FECHA: ${date}
      ${type === 'normal' ? 'TURNO NORMAL' : 'TURNO 3ERA EDAD'}
      ${secuencial}
      ${type === 'tercera' ? '=== PRIORIDAD ===' : ''}
      ----------------
    `;
  
    this.turnosDelDia.push(turno);
    type === 'normal' ? this.turnosNormal++ : this.turnosTercera++;
    this.saveReport();
    this.printTicket(turno);
    toast.success('Turno generado correctamente');
  }

  resetTurns() {
    this.turnosNormal = 0;
    this.turnosTercera = 0;
    this.turnosDelDia = [];
    this.saveReport();
    toast.info('Turnos reiniciados automáticamente.');
  }

  printReport() {
    const dialogRef = this.dialog.open(PasswordDialogComponent, {
      width: '300px',
    });

    dialogRef.afterClosed().subscribe((password) => {
      if (password === '1234') {
        this.generateReport();
      } else if (password !== null) {
        toast.error('Contraseña incorrecta. No se pudo generar el informe.');
      }
    });
  }

  generateReport() {
    const report = `
    Conteo de Turnos:
    Normales: ${this.turnosNormal}
    3era Edad: ${this.turnosTercera}
    
    Turnos Generados:
    ${this.turnosDelDia.join('\n\n')}
    `;
    this.printTicket(report);
    toast.success('Informe enviado a la impresora.');
  }

  printTicket(content: string) {
    try {
      console.log('Enviando contenido a imprimir:', content);
      const cleanedContent = content.replace(/<\/?[^>]+(>|$)/g, "");
      window.electron.ipcRenderer.send('generate-ticket', cleanedContent);
    } catch (error) {
      console.error('Error al enviar el ticket:', error);
      toast.error('No se pudo imprimir el ticket.');
    }
  }

  saveReport() {
    const totalTurnos = this.turnosNormal + this.turnosTercera;
    const report = `
    Conteo de Turnos:
    Normales: ${this.turnosNormal}
    3era Edad: ${this.turnosTercera}
    Total de Turnos: ${totalTurnos}
    
    Turnos Generados:
    ${this.turnosDelDia.join('\n\n')}
    `;
  
    window.electron.ipcRenderer.send('save-report', report);
  }

  ImprimirReporte() {
    const totalTurnos = this.turnosNormal + this.turnosTercera;
    const date = new Date().toLocaleDateString('es-EC');
  
    const report = `
    Conteo de Turnos:
    Fecha: ${date}
    Normales: ${this.turnosNormal}
    3era Edad: ${this.turnosTercera}
    Total de Turnos: ${totalTurnos}
    `;
  
    this.printTicket(report);
    toast.success('Informe enviado a la impresora.');
  }
}
