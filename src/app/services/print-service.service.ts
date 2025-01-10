import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  private printerUrl = 'http://<printer-ip>/StarWebPRNT/SendMessage';

  constructor(private http: HttpClient) {}

  printTicket(content: string): Observable<any> {
    const body = `actions=Justification:Center|Text:${encodeURIComponent(content)}\n`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post(this.printerUrl, body, { headers });
  }
}
