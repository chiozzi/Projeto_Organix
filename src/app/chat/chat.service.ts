import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Mensagem {
  id?: number;
  autor: string;
  texto: string;
  timestamp: string;
}

export interface Conversa {
  id?: number;
  nome: string;
  tipo: 'bot' | 'usuario' | 'grupo';
  fixado?: boolean;
  icone?: string;
  mensagens: Mensagem[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly URL_BASE = `${environment.apiUrl}/conversas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Conversa[]> {
    return this.http.get<Conversa[]>(this.URL_BASE);
  }

  buscarPorId(id: number): Observable<Conversa> {
    return this.http.get<Conversa>(`${this.URL_BASE}/${id}`);
  }

  criar(conversa: Partial<Conversa>): Observable<Conversa> {
    return this.http.post<Conversa>(this.URL_BASE, conversa);
  }

  atualizar(id: number, conversa: Conversa): Observable<Conversa> {
    return this.http.put<Conversa>(`${this.URL_BASE}/${id}`, conversa);
  }

  atualizarParcial(id: number, patch: Partial<Conversa>): Observable<Conversa> {
    return this.http.patch<Conversa>(`${this.URL_BASE}/${id}`, patch);
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL_BASE}/${id}`);
  }
}