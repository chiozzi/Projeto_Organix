import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Flag, StatusExecucao, Tarefa, TarefasService } from '../tarefas.service';

@Component({
  selector: 'app-vertarefas',
  standalone: false,
  templateUrl: './vertarefas.component.html',
  styleUrl: './vertarefas.component.css'
})
export class VertarefasComponent implements OnInit, OnDestroy {

  // -------------------------------------------------------
  // Entrada: tarefa a ser exibida
  // -------------------------------------------------------
  @Input() tarefa: Tarefa | null = null;  // -------------------------------------------------------
  // Saídas: ações possíveis dentro do modal
  // -------------------------------------------------------
  @Output() fechar   = new EventEmitter<void>();
  @Output() editar   = new EventEmitter<Tarefa>();
  @Output() concluir = new EventEmitter<Tarefa>();
  @Output() excluir  = new EventEmitter<Tarefa>();
  @Output() arquivar = new EventEmitter<Tarefa>();

  // Expõe os enums para uso no template
  StatusExecucao = StatusExecucao;
  Flag = Flag;

  // Controla a animação de fechamento do modal
  estaFechando = false;

  // Controla a exibição do check grande (animação de conclusão)
  mostrarAnimacaoConclusao = false;

  constructor(private tarefasService: TarefasService) {}

  ngOnInit(): void {
    // Trava o scroll da página enquanto o modal estiver aberto
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    // Restaura o scroll ao fechar
    document.body.style.overflow = '';
  }

  // -------------------------------------------------------
  // FECHAR MODAL
  // -------------------------------------------------------

  /** Fecha o modal com animação de saída (300ms) */
  fecharModal(): void {
    this.estaFechando = true;
    setTimeout(() => {
      this.fechar.emit();
      this.estaFechando = false;
    }, 300);
  }

  // -------------------------------------------------------
  // AÇÕES DO RODAPÉ
  // -------------------------------------------------------

  /** Emite o evento de edição com a tarefa atual */
  solicitarEdicao(): void {
    if (!this.tarefa) return;
    this.editar.emit(this.tarefa);
  }

  /**
   * Conclui a tarefa:
   * 1. Atualiza no servidor
   * 2. Exibe animação de check por 1 segundo
   * 3. Fecha o modal e notifica o componente pai
   */
  concluirTarefa(): void {
    if (!this.tarefa?.id) return;

    this.mostrarAnimacaoConclusao = true;

    const tarefaConcluida: Tarefa = {
      ...this.tarefa,
      statusExecucao: StatusExecucao.Concluido,
      flag: Flag.Concluido
    };

    this.tarefasService.atualizar(this.tarefa.id, tarefaConcluida).subscribe({
      next: () => {
        setTimeout(() => {
          this.concluir.emit(tarefaConcluida);
          this.fecharModal();
          this.mostrarAnimacaoConclusao = false;
        }, 1000);
      },
      error: (erro) => console.error('Erro ao concluir tarefa:', erro)
    });
  }

  /**
   * Move a tarefa para a lixeira (excluido = true) com confirmação.
   * O pai decide o que fazer com o evento emitido.
   */
  moverParaLixeira(): void {
    if (!this.tarefa?.id) return;

    const confirmado = confirm('Tem certeza que deseja excluir esta tarefa?');
    if (!confirmado) return;

    const copia: Tarefa = { ...this.tarefa };

    this.tarefasService.atualizar(this.tarefa.id, { ...copia, excluido: true }).subscribe({
      next: () => {
        this.excluir.emit(copia);
        this.fecharModal();
      },
      error: (erro) => console.error('Erro ao excluir tarefa:', erro)
    });
  }

  arquivarTarefa(): void {
  if (!this.tarefa?.id) return;

  const confirmado = confirm('Tem certeza que deseja arquivar esta tarefa?');
  if (!confirmado) return;

  this.tarefasService.atualizar(this.tarefa.id, { ...this.tarefa, arquivado: true }).subscribe({
    next: () => {
      this.arquivar.emit(this.tarefa!);
      this.fecharModal();
    },
    error: (erro) => console.error('Erro ao arquivar tarefa:', erro)
  });
}

  // -------------------------------------------------------
  // HELPERS DE ESTILO
  // -------------------------------------------------------

  /**
   * Retorna a classe CSS correspondente à flag da tarefa,
   * usada para colorir o badge de status no modal.
   */
  obterClasseFlag(flag?: Flag): string {
    const mapa: Record<Flag, string> = {
      [Flag.Atrasado]: 'status atraso',
      [Flag.Urgente]:  'status urgente',
      [Flag.Pendente]: 'status pendente',
      [Flag.Concluido]:'status concluido',
      [Flag.Normal]:   'status normal'
    };
    return flag ? (mapa[flag] ?? '') : '';
  }
}
