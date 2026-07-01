import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; 

// -------------------------------------------------------
// Enum: situação de execução da tarefa no kanban
// -------------------------------------------------------
export enum StatusExecucao {
  AFazer     = 'A Fazer',
  EmAtraso   = 'Em Atraso',
  EmAndamento = 'Em Andamento',
  Concluido  = 'Concluído'
}

// -------------------------------------------------------
// Enum: prioridade/urgência calculada automaticamente
// com base no prazo de vencimento
// -------------------------------------------------------
export enum Flag {
  Normal   = 'Normal',    // vence em mais de 72h
  Pendente = 'Pendente',  // vence entre 24h e 72h
  Urgente  = 'Urgente',   // vence em menos de 24h
  Atrasado = 'Atrasado',  // prazo já passou
  Concluido = 'Concluido' // tarefa finalizada
}

// -------------------------------------------------------
// Interface: estrutura completa de uma tarefa
// -------------------------------------------------------
export interface Tarefa {
  id?:              number;
  titulo:           string;
  descricao:        string;
  dataVencimento:   string;        // formato: YYYY-MM-DD
  horaVencimento:   string;        // formato: HH:mm
  statusExecucao:   StatusExecucao;
  flag:             Flag;
  ordem:            number;        // posição dentro da coluna do kanban

  // campos de controle interno (não persistidos no banco)
  arquivado?:       boolean;       // true = tarefa arquivada
  excluido?:        boolean;       // true = tarefa na lixeira
  removendo?:       boolean;       // true = animação de saída ativa
  _statusNorm?:     string;        // status normalizado para comparações
}

// -------------------------------------------------------
// Serviço: comunicação com a API REST (json-server)
// endpoint base: http://localhost:3000/tarefas
// -------------------------------------------------------
@Injectable({ providedIn: 'root' })
export class TarefasService {

  private readonly URL_BASE = `${environment.apiUrl}/tarefas`;

  constructor(private http: HttpClient) {}

  /** Retorna todas as tarefas do banco */
  listar(): Observable<Tarefa[]> {
    return this.http.get<Tarefa[]>(this.URL_BASE);
  }

  /** Cria uma nova tarefa */
  criar(tarefa: Tarefa): Observable<Tarefa> {
    return this.http.post<Tarefa>(this.URL_BASE, tarefa);
  }

  /** Substitui todos os campos de uma tarefa existente */
  atualizar(id: number, tarefa: Tarefa): Observable<Tarefa> {
    return this.http.put<Tarefa>(`${this.URL_BASE}/${id}`, tarefa);
  }

  /** Apaga permanentemente uma tarefa */
  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL_BASE}/${id}`);
  }

  /** Atualiza apenas o campo de ordem (posição no kanban) */
  atualizarOrdem(id: number, novaOrdem: number): Observable<Tarefa> {
    return this.http.patch<Tarefa>(`${this.URL_BASE}/${id}`, { ordem: novaOrdem });
  }
}
