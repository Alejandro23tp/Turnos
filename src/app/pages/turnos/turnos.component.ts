import { Component, OnInit } from '@angular/core';
import { toast } from 'ngx-sonner';
import { IpcRendererEvent } from 'electron';
import { MatDialog } from '@angular/material/dialog';
import { PasswordDialogComponent } from '../../password-dialog/password-dialog.component';


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

  constructor(private dialog: MatDialog) {}

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
  }

  updateDate() {
    const today = new Date();
    this.currentDate = today.toLocaleDateString('es-EC');
  }

  handleTurn(type: 'normal' | 'tercera') {
    const date = new Date().toLocaleDateString('es-EC');
    const secuencial = type === 'normal' ? `N${this.turnosNormal + 1}` : `E${this.turnosTercera + 1}`;
  
    const turno = `
      GADM LA LIBERTAD
      ----------------
      FECHA: ${date}
      ${type === 'normal' ? 'TURNO NORMAL' : 'TURNO 3ERA EDAD'}
      N° ${secuencial}
      ${type === 'tercera' ? '=== PRIORIDAD ===' : ''}
      ----------------
    `;
  
    this.turnosDelDia.push(turno);
    type === 'normal' ? this.turnosNormal++ : this.turnosTercera++;
    this.saveTurnsToStorage();
  
    this.printTicket(turno);
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

 /* printReport() {
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
  } */
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
      // Enviar el reporte a la impresora en lugar de guardarlo como archivo
      this.printTicket(report);
      toast.success('Informe enviado a la impresora.');
    }
    

    printTicket(content: string) {
      try {
        console.log('Enviando contenido a imprimir:', content);
        // Aseguramos que el contenido sea adecuado
        const cleanedContent = content.replace(/<\/?[^>]+(>|$)/g, ""); // Limpiamos etiquetas HTML
        window.electron.ipcRenderer.send('generate-ticket', cleanedContent);
      } catch (error) {
        console.error('Error al enviar el ticket:', error);
        toast.error('No se pudo imprimir el ticket.');
      }
    }
    

  printTicketNav(content: string) {
    try {
      // Crear un elemento de estilo para la impresión
      const styleSheet = document.createElement('style');
      styleSheet.media = 'print';
      styleSheet.textContent = `
        @media print {
          body * {
            visibility: hidden;
          }
          #printSection, #printSection * {
            visibility: visible;
          }
          #printSection {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: 80mm 150mm;
            margin: 0;
          }
        }
      `;
      document.head.appendChild(styleSheet);
  
      // Crear y configurar el contenedor de impresión
      const printDiv = document.createElement('div');
      printDiv.id = 'printSection';
      printDiv.style.fontFamily = 'monospace';
      printDiv.style.whiteSpace = 'pre';
      printDiv.style.textAlign = 'center';
      printDiv.innerHTML = content;
      
      // Agregar temporalmente al DOM
      document.body.appendChild(printDiv);
  
      // Imprimir inmediatamente
      window.print();
  
      // Limpiar después de imprimir
      requestAnimationFrame(() => {
        document.body.removeChild(printDiv);
        document.head.removeChild(styleSheet);
      });
  
    } catch (error) {
      console.error('Error al imprimir:', error);
      toast.error('Error al imprimir el ticket');
    }
  }
  

  saveReport() {
    const totalTurnos = this.turnosNormal + this.turnosTercera; // Sumar los turnos
  
    const report = `
    Conteo de Turnos:
    Normales: ${this.turnosNormal}
    3era Edad: ${this.turnosTercera}
    Total de Turnos: ${totalTurnos}  <!-- Mostrar el total de turnos -->
    
    Turnos Generados:
    ${this.turnosDelDia.join('\n\n')}
    `;
    
    // Crear el archivo y desencadenar la descarga
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_turnos_${new Date().toLocaleDateString('es-EC').replace(/\//g, '-')}.txt`;
    link.click();
  
    toast.success('Informe guardado exitosamente.');
  }
  
  
}
