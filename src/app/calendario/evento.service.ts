import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Evento {
  id: number;
  data: string;
  titulo: string;
  descricao: string;
  horario: string;
}

@Injectable({ providedIn: 'root' })
export class EventoService {
  private readonly URL_BASE = `${environment.apiUrl}/eventos`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Evento[]> {
    return this.http.get<Evento[]>(this.URL_BASE);
  }

  criar(evento: Omit<Evento, 'id'>): Observable<Evento> {
    return this.http.post<Evento>(this.URL_BASE, evento);
  }

  atualizar(id: number, evento: Evento): Observable<Evento> {
    return this.http.put<Evento>(`${this.URL_BASE}/${id}`, evento);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL_BASE}/${id}`);
  }
}