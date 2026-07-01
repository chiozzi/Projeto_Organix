import { Component, OnInit } from '@angular/core';
import { Tarefa, TarefasService } from '../tarefas/tarefas.service';

@Component({
  selector: 'app-excluidas',
  standalone: false,
  templateUrl: './excluidas.component.html',
  styleUrl: './excluidas.component.css'
})
export class ExcluidasComponent implements OnInit {
  tarefas: Tarefa[] = [];

  constructor(private tarefasService: TarefasService) {}

  ngOnInit(): void {
    this.carregarExcluidas();
  }

  carregarExcluidas(): void {
    this.tarefasService.listar().subscribe(tarefas => {
      this.tarefas = tarefas.filter(t => t.excluido);
    });
  }

  restaurar(tarefa: Tarefa): void {
    this.tarefasService.atualizar(tarefa.id!, { ...tarefa, excluido: false }).subscribe(() => {
      this.carregarExcluidas();
    });
  }

  excluirDefinitivamente(tarefa: Tarefa): void {
    const confirmado = confirm('Excluir permanentemente? Não tem volta.');
    if (!confirmado) return;
    this.tarefasService.remover(tarefa.id!).subscribe(() => {
      this.carregarExcluidas();
    });
  }
}