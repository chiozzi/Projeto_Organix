import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Flag, StatusExecucao, Tarefa, TarefasService } from './tarefas.service';

@Component({
  selector: 'app-tarefas',
  standalone: false,
  templateUrl: './tarefas.component.html',
  styleUrl: './tarefas.component.css'
})
export class TarefasComponent implements OnInit {

  // -------------------------------------------------------
  // Listas do kanban (uma por coluna)
  // -------------------------------------------------------
  tarefasAFazer:      Tarefa[] = [];
  tarefasEmAndamento: Tarefa[] = [];
  tarefasConcluidas:  Tarefa[] = [];

  // Controla se a seção "Concluídas" está expandida ou recolhida
  mostrarConcluidas = true;

  // -------------------------------------------------------
  // Controle dos modais
  // -------------------------------------------------------
  tarefaAbertaNoModal:  Tarefa | null = null;  // modal de visualização
  exibirModalCriar:     boolean = false;        // modal de criar/editar
  tarefaParaEditar:     Tarefa | null = null;   // tarefa pré-carregada no modal de edição

  // Expõe os enums para uso direto no template HTML
  StatusExecucao = StatusExecucao;
  Flag = Flag;

  // -------------------------------------------------------
  // Mapa: ID do elemento HTML → status correspondente
  // Usado para identificar a coluna de destino no drag & drop
  // -------------------------------------------------------
  private readonly colunaParaStatus: Record<string, StatusExecucao> = {
    afazer:      StatusExecucao.AFazer,
    emandamento: StatusExecucao.EmAndamento,
    concluidas:  StatusExecucao.Concluido
  };

  constructor(
    private tarefasService: TarefasService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.carregarEDistribuirTarefas();
    this.ouvirFragmentoDeNavegacao();
  }

  // -------------------------------------------------------
  // CARREGAMENTO E DISTRIBUIÇÃO NAS COLUNAS
  // -------------------------------------------------------

  /**
   * Busca todas as tarefas da API, atualiza status/flag
   * automaticamente conforme o prazo, e distribui nas colunas.
   */
  carregarEDistribuirTarefas(): void {
    this.tarefasService.listar().subscribe(tarefas => {
      const agora = new Date();

      tarefas.forEach(tarefa => this.atualizarStatusPorPrazo(tarefa, agora));

      const tarefasComNorm = tarefas.map(t => ({
        ...t,
        _statusNorm: this.normalizarTexto(t.statusExecucao)
      }));

      const chaveAFazer     = this.normalizarTexto(StatusExecucao.AFazer);
      const chaveAndamento  = this.normalizarTexto(StatusExecucao.EmAndamento);
      const chaveConcluido  = this.normalizarTexto(StatusExecucao.Concluido);
      const chaveAtraso     = this.normalizarTexto(StatusExecucao.EmAtraso);

      // Coluna "A Fazer" inclui tanto pendentes quanto atrasadas
      this.tarefasAFazer = tarefasComNorm.filter(t =>
        [chaveAFazer, chaveAtraso].includes(t._statusNorm!) || t.flag === Flag.Atrasado
      );

      this.tarefasEmAndamento = tarefasComNorm.filter(t =>
        t._statusNorm === chaveAndamento
      );

      this.tarefasConcluidas = tarefasComNorm.filter(t =>
        t._statusNorm === chaveConcluido
      );
    });
  }

  /**
   * Verifica se o prazo venceu e atualiza status e flag.
   * Salva na API apenas se houve mudança real.
   */
  private atualizarStatusPorPrazo(tarefa: Tarefa, agora: Date): void {
    const isConcluida = this.normalizarTexto(tarefa.statusExecucao) ===
      this.normalizarTexto(StatusExecucao.Concluido);

    if (isConcluida) return; // tarefas concluídas não mudam de status

    const dataHoraVencimento = tarefa.dataVencimento
      ? new Date(`${tarefa.dataVencimento}T${tarefa.horaVencimento || '23:59'}`)
      : null;

    const statusAnterior = tarefa.statusExecucao;
    const flagAnterior   = tarefa.flag;

    if (dataHoraVencimento && !isNaN(dataHoraVencimento.getTime())) {
      const jaAtrasada = this.normalizarTexto(tarefa.statusExecucao) ===
        this.normalizarTexto(StatusExecucao.EmAtraso);

      if (dataHoraVencimento < agora) {
        tarefa.statusExecucao = StatusExecucao.EmAtraso;
      } else if (jaAtrasada) {
        // prazo foi estendido: volta para "A Fazer"
        tarefa.statusExecucao = StatusExecucao.AFazer;
      }
    }

    tarefa.flag = this.calcularFlagPorPrazo(tarefa);

    // Persiste só se algo mudou (evita requisições desnecessárias)
    const houveMudanca = tarefa.statusExecucao !== statusAnterior ||
      tarefa.flag !== flagAnterior;

    if (houveMudanca && tarefa.id) {
      this.tarefasService.atualizar(tarefa.id, tarefa).subscribe();
    }
  }

  /**
   * Calcula a flag (prioridade) com base no tempo restante até o vencimento.
   * - Concluído: sempre Flag.Concluido
   * - Venceu:    Atrasado
   * - < 24h:     Urgente
   * - 24h-72h:   Pendente
   * - > 72h:     Normal
   */
  private calcularFlagPorPrazo(tarefa: Tarefa): Flag {
    if (tarefa.statusExecucao === StatusExecucao.Concluido) {
      return Flag.Concluido;
    }

    const agora      = new Date();
    const vencimento = new Date(`${tarefa.dataVencimento}T${tarefa.horaVencimento || '23:59'}`);

    if (vencimento < agora) return Flag.Atrasado;

    const horasRestantes = (vencimento.getTime() - agora.getTime()) / (1000 * 60 * 60);

    if (horasRestantes >= 72) return Flag.Normal;
    if (horasRestantes >= 24) return Flag.Pendente;
    return Flag.Urgente;
  }

  // -------------------------------------------------------
  // MODAL DE VISUALIZAÇÃO
  // -------------------------------------------------------

  abrirModalVisualizacao(tarefa: Tarefa): void {
    this.tarefaAbertaNoModal = tarefa;
  }

  fecharModalVisualizacao(): void {
    this.tarefaAbertaNoModal = null;
  }

  // -------------------------------------------------------
  // MODAL DE CRIAR / EDITAR
  // -------------------------------------------------------

  abrirModalCriarOuEditar(tarefa?: Tarefa): void {
    this.tarefaParaEditar = tarefa ?? null;
    this.exibirModalCriar = true;
  }

  /**
   * Chamado quando o modal de criar/editar emite o evento (salvar).
   * Atualiza a lista localmente e recarrega do servidor.
   */
  aoSalvarTarefa(tarefaSalva: Tarefa): void {
    this.exibirModalCriar = false;

    if (!tarefaSalva.statusExecucao) {
      tarefaSalva.statusExecucao = StatusExecucao.AFazer;
    }

    // Substitui nas listas locais para resposta imediata na tela
    [this.tarefasAFazer, this.tarefasEmAndamento, this.tarefasConcluidas].forEach(lista => {
      const posicao = lista.findIndex(t => t.id === tarefaSalva.id);
      if (posicao !== -1) lista[posicao] = tarefaSalva;
    });

    this.carregarEDistribuirTarefas();
  }

  // -------------------------------------------------------
  // AÇÕES NAS TAREFAS
  // -------------------------------------------------------

  /**
   * Move a tarefa para a lixeira (campo excluido = true).
   * Usa animação de saída antes de remover da lista.
   */
  moverParaLixeira(tarefa: Tarefa): void {
    if (!tarefa.id) return;

    tarefa.removendo = true; // dispara animação CSS de saída

    const tarefaExcluida: Tarefa = { ...tarefa, excluido: true };

    setTimeout(() => {
      this.removerDasListas(tarefa.id!);
      this.fecharModalVisualizacao();
    }, 300);

    this.tarefasService.atualizar(tarefa.id, tarefaExcluida).subscribe();
  }

  /**
   * Marca a tarefa como concluída e move para a coluna correta.
   */
  marcarComoConcluida(tarefa: Tarefa): void {
    if (!tarefa.id) return;

    const tarefaConcluida: Tarefa = {
      ...tarefa,
      statusExecucao: StatusExecucao.Concluido,
      flag: Flag.Concluido
    };

    this.tarefasService.atualizar(tarefa.id, tarefaConcluida).subscribe({
      next: () => {
        this.carregarEDistribuirTarefas();
        this.fecharModalVisualizacao();
      }
    });
  }

  // -------------------------------------------------------
  // DRAG & DROP
  // -------------------------------------------------------

  /**
   * Trata o drop de um card entre colunas:
   * 1. Move o item visualmente
   * 2. Detecta a coluna de destino pelo ID do elemento
   * 3. Atualiza status e flag
   * 4. Persiste no servidor
   */
  aoSoltarCard(event: CdkDragDrop<Tarefa[]>): void {
    const tarefa = event.item.data as Tarefa;
    if (!tarefa?.id) return;

    const idColunaDestino = event.container.id;
    const novoStatus = this.colunaParaStatus[idColunaDestino];
    if (!novoStatus) return;

    // Move visualmente na tela
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Persiste o novo status e recalcula a flag
    const tarefaAtualizada: Tarefa = {
      ...tarefa,
      statusExecucao: novoStatus,
      flag: this.calcularFlagPorPrazo({ ...tarefa, statusExecucao: novoStatus }),
      ordem: event.currentIndex
    };

    this.tarefasService.atualizar(tarefa.id, tarefaAtualizada).subscribe();

    // Atualiza a ordem de todos os cards da coluna de destino
    event.container.data.forEach((t, index) => {
      if (t.id) this.tarefasService.atualizarOrdem(t.id, index).subscribe();
    });
  }

  // -------------------------------------------------------
  // COLUNA CONCLUÍDAS
  // -------------------------------------------------------

  alternarVisibilidadeConcluidas(): void {
    this.mostrarConcluidas = !this.mostrarConcluidas;
  }

  // -------------------------------------------------------
  // HELPERS PRIVADOS
  // -------------------------------------------------------

  /**
   * Remove acentos, espaços extras e normaliza para minúsculas.
   * Usado para comparar strings de status sem sensibilidade a acento.
   */
  private normalizarTexto(texto?: any): string {
    return texto
      ? String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
      : '';
  }

  /** Remove uma tarefa de todas as colunas pelo ID */
  private removerDasListas(id: number): void {
    this.tarefasAFazer      = this.tarefasAFazer.filter(t => t.id !== id);
    this.tarefasEmAndamento = this.tarefasEmAndamento.filter(t => t.id !== id);
    this.tarefasConcluidas  = this.tarefasConcluidas.filter(t => t.id !== id);
  }

  /**
   * Escuta o fragmento da URL (ex: /tarefas#emandamento)
   * e rola + destaca a coluna correspondente.
   */
  private ouvirFragmentoDeNavegacao(): void {
    this.route.fragment.subscribe(fragmento => {
      if (!fragmento) return;

      setTimeout(() => {
        const elemento = document.getElementById(fragmento);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
          elemento.classList.add('destacado');
          setTimeout(() => elemento.classList.remove('destacado'), 2000);
        }
      }, 300);
    });
  }

  aoArquivarTarefa(tarefa: Tarefa): void {
    this.removerDasListas(tarefa.id!);
    this.fecharModalVisualizacao();
  }
}
