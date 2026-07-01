import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Flag, StatusExecucao, Tarefa, TarefasService } from '../tarefas.service';

@Component({
  selector: 'app-criartarefas',
  standalone: false,
  templateUrl: './criartarefas.component.html',
  styleUrl: './criartarefas.component.css'
})
export class CriartarefasComponent implements OnInit, OnDestroy {

  // -------------------------------------------------------
  // Entrada: se fornecida, o modal abre em modo de edição
  // -------------------------------------------------------
  @Input() tarefa: Tarefa | null = null;

  // -------------------------------------------------------
  // Saídas: tarefa salva ou modal cancelado
  // -------------------------------------------------------
  @Output() salvar = new EventEmitter<Tarefa>();
  @Output() fechar = new EventEmitter<void>();

  formulario!: FormGroup;

  // Controla a animação de fechamento
  estaFechando = false;

  // Data de hoje em formato YYYY-MM-DD (usada como valor mínimo no input de data)
  dataMinima: string = '';

  constructor(private tarefasService: TarefasService) {}

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    this.definirDataMinima();
    this.inicializarFormulario();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  // -------------------------------------------------------
  // INICIALIZAÇÃO
  // -------------------------------------------------------

  /** Define a data mínima como hoje (impede criar tarefa no passado) */
  private definirDataMinima(): void {
    this.dataMinima = new Date().toISOString().split('T')[0];
  }

  /**
   * Monta o formulário reativo.
   * Se uma tarefa foi passada como @Input, pré-preenche os campos.
   */
  private inicializarFormulario(): void {
    this.formulario = new FormGroup({
      titulo: new FormControl(
        this.tarefa?.titulo ?? '',
        Validators.required
      ),
      descricao: new FormControl(
        this.tarefa?.descricao ?? ''
      ),
      dataVencimento: new FormControl(
        this.tarefa?.dataVencimento ?? '',
        Validators.required
      ),
      horaVencimento: new FormControl(
        this.tarefa?.horaVencimento ?? '',
        Validators.required
      ),
      statusExecucao: new FormControl(
        this.tarefa?.statusExecucao ?? StatusExecucao.AFazer,
        Validators.required
      )
    });
  }

  // -------------------------------------------------------
  // SALVAR
  // -------------------------------------------------------

  /**
   * Valida o formulário e salva (criar ou atualizar).
   * Bloqueia se a data selecionada for anterior a hoje.
   */
  salvarTarefa(): void {
    if (this.formulario.invalid) return;

    const valores = this.formulario.value;

    if (!this.tarefa && valores.dataVencimento < this.dataMinima) {
      alert('Não é permitido criar tarefa em datas anteriores a hoje.');
      return;
    }

    const tarefaParaSalvar: Tarefa = {
      ...this.tarefa,                          // mantém campos não editáveis (id, ordem, etc.)
      titulo:          valores.titulo,
      descricao:       valores.descricao,
      dataVencimento:  valores.dataVencimento,
      horaVencimento:  valores.horaVencimento,
      statusExecucao:  valores.statusExecucao ?? StatusExecucao.AFazer,
      flag:            this.tarefa?.flag ?? Flag.Normal,
      ordem:           this.tarefa?.ordem ?? 0
    };

    // Determina se é criação ou edição
    const operacao$ = this.tarefa?.id
      ? this.tarefasService.atualizar(this.tarefa.id, tarefaParaSalvar)
      : this.tarefasService.criar(tarefaParaSalvar);

    operacao$.subscribe({
      next: (tarefaSalva) => {
        this.salvar.emit(tarefaSalva);
        this.fecharModal();
      },
      error: (erro) => console.error('Erro ao salvar tarefa:', erro)
    });
  }

  // -------------------------------------------------------
  // FECHAR / CANCELAR
  // -------------------------------------------------------

  cancelar(): void {
    this.fecharModal();
  }

  /** Fecha o modal com animação de saída (300ms) */
  fecharModal(): void {
    this.estaFechando = true;
    setTimeout(() => {
      this.fechar.emit();
      this.estaFechando = false;
    }, 300);
  }
}
