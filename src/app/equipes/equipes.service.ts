import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChecklistItem {
  tarefa: string;
  feito: boolean;
}

export interface Comentario {
  usuario: string;
  texto: string;
  data: Date;
}

export interface Equipe {
  id?: number;
  nome: string;
  lider: string;
  membros: string[];
  etiqueta: string;
  descricao: string;
  checklist: ChecklistItem[];
  comentarios: Comentario[];
  dataCriacao: Date;
  dataPrazo: string | null;
}

@Injectable({ providedIn: 'root' })
export class EquipesService {
  private readonly URL_BASE = `${environment.apiUrl}/equipes`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Equipe[]> {
    return this.http.get<Equipe[]>(this.URL_BASE);
  }

  criar(equipe: Omit<Equipe, 'id'>): Observable<Equipe> {
    return this.http.post<Equipe>(this.URL_BASE, equipe);
  }

  atualizar(id: number, equipe: Equipe): Observable<Equipe> {
    return this.http.put<Equipe>(`${this.URL_BASE}/${id}`, equipe);
  }
}