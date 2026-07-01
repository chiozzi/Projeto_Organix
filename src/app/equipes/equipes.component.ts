import { Component, OnInit } from '@angular/core';
import { EquipesService, Equipe } from './equipes.service';

@Component({
  selector: 'app-equipes',
  standalone: false,
  templateUrl: './equipes.component.html',
  styleUrls: ['./equipes.component.css']
})
export class EquipesComponent implements OnInit {
  equipes: Equipe[] = [];
  mostrarModal = false;

  novaEquipe = {
    nome: '',
    lider: '',
    membrosInput: '',
    dataPrazo: '',
    descricao: ''
  };

  detalhesEquipe: Equipe | null = null;
  novoChecklist: string = '';
  novoComentario: string = '';

  constructor(private equipesService: EquipesService) {}

  ngOnInit(): void {
    this.carregarEquipes();
  }

  carregarEquipes(): void {
    this.equipesService.listar().subscribe((data) => {
      this.equipes = data;
    });
  }

  abrirModal() {
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.novaEquipe = { nome: '', lider: '', membrosInput: '', dataPrazo: '', descricao: '' };
  }

  criarEquipe() {
    if (!this.novaEquipe.nome || !this.novaEquipe.lider) {
      alert('Por favor, preencha o nome e o líder da equipe.');
      return;
    }

    const equipe = {
      nome: this.novaEquipe.nome,
      lider: this.novaEquipe.lider,
      membros: this.novaEquipe.membrosInput
        ? this.novaEquipe.membrosInput.split(',').map(m => m.trim())
        : [],
      etiqueta: 'afazer',
      descricao: this.novaEquipe.descricao || '',
      checklist: [],
      comentarios: [],
      dataCriacao: new Date(),
      dataPrazo: this.novaEquipe.dataPrazo || null
    };

    this.equipesService.criar(equipe)
      .subscribe(() => {
        this.carregarEquipes();
        this.fecharModal();
      });
  }

  abrirDetalhes(equipe: Equipe) {
    this.detalhesEquipe = {
      ...equipe,
      etiqueta: equipe.etiqueta || 'afazer',
      descricao: equipe.descricao || '',
      checklist: equipe.checklist || [],
      comentarios: equipe.comentarios || []
    };
  }

  fecharDetalhes() {
    this.detalhesEquipe = null;
  }

  adicionarChecklist() {
    if (this.novoChecklist.trim() !== '' && this.detalhesEquipe) {
      this.detalhesEquipe.checklist.push({ tarefa: this.novoChecklist, feito: false });
      this.novoChecklist = '';
    }
  }

  removerChecklistItem(i: number) {
    if (this.detalhesEquipe) {
      this.detalhesEquipe.checklist.splice(i, 1);
    }
  }

  adicionarComentario() {
    if (this.novoComentario.trim() !== '' && this.detalhesEquipe) {
      const novo = {
        usuario: 'Usuário atual',
        texto: this.novoComentario,
        data: new Date()
      };
      this.detalhesEquipe.comentarios.push(novo);
      this.novoComentario = '';
    }
  }

  salvarDetalhes() {
    if (!this.detalhesEquipe || !this.detalhesEquipe.id) return;

    this.equipesService.atualizar(this.detalhesEquipe.id, this.detalhesEquipe)
      .subscribe(() => {
        this.carregarEquipes();
        this.fecharDetalhes();
      });
  }

  getProgresso(equipe: Equipe): number {
    if (!equipe.checklist || equipe.checklist.length === 0) return 0;
    const feitos = equipe.checklist.filter((item) => item.feito).length;
    return (feitos / equipe.checklist.length) * 100;
  }
}