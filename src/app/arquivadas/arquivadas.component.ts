import { Component, OnInit } from '@angular/core';
import { Tarefa, TarefasService } from '../tarefas/tarefas.service';

@Component({
  selector: 'app-arquivadas',
  standalone: false,
  templateUrl: './arquivadas.component.html',
  styleUrl: './arquivadas.component.css'
})
export class ArquivadasComponent implements OnInit {
  tarefas: Tarefa[] = [];

  constructor(private tarefasService: TarefasService) {}

  ngOnInit(): void {
    this.carregarArquivadas();
  }

  carregarArquivadas(): void {
    this.tarefasService.listar().subscribe(tarefas => {
      this.tarefas = tarefas.filter(t => t.arquivado && !t.excluido);
    });
  }

  desarquivar(tarefa: Tarefa): void {
    this.tarefasService.atualizar(tarefa.id!, { ...tarefa, arquivado: false }).subscribe(() => {
      this.carregarArquivadas();
    });
  }
}