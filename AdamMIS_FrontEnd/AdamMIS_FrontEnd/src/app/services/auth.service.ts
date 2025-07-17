import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7209';

  constructor(private http: HttpClient) { }

login(credentials: { userName: string; password: string }): Observable<any> {
  console.log('Sending login request to API...', credentials); // 👈 Add this
  return this.http.post(`${this.apiUrl}/Auth`, credentials);
}

  register(userData: { userName: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/register`, userData);
  }
}