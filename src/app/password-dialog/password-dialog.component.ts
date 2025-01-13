import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-password-dialog',
  template: `
    <h1 mat-dialog-title>Ingrese la contraseña</h1>
    <div mat-dialog-content>
      <mat-form-field appearance="fill">
        <mat-label>Contraseña</mat-label>
        <input matInput type="password" [(ngModel)]="password" />
      </mat-form-field>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-button color="primary" (click)="onSubmit()">Aceptar</button>
    </div>
  `,
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule]
})
export class PasswordDialogComponent {
  password: string = '';

  constructor(private dialogRef: MatDialogRef<PasswordDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    this.dialogRef.close(this.password);
  }
}
