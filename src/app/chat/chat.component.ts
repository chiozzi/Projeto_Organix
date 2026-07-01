import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ChatService, Conversa, Mensagem } from './chat.service';

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesBox') messagesBox!: ElementRef;

  conversations: Conversa[] = [];
  conversationsFiltered: Conversa[] = [];
  pinnedConversations: Conversa[] = [];
  selected?: Conversa;
  draft = '';
  filter = '';
  typing = false;
  pollingSub?: Subscription;

  // modal edit
  editModalOpen = false;
  editModel: Partial<Conversa> = {};

  botRules: { pattern: RegExp; resposta: string }[] = [
    { pattern: /tarefa|tarefas/i, resposta: 'Para criar uma tarefa vá na tela de Tarefas e clique no botão "Nova". Quer que eu crie uma tarefa de teste?' },
    { pattern: /calend[aá]rio/i, resposta: 'Na aba Calendário você visualiza eventos. Deseja ver os eventos próximos?' },
    { pattern: /ajuda|\/ajuda/i, resposta: 'Comandos: /ajuda, /tutorial, /atalhos, /contato' },
    { pattern: /tutorial|\/tutorial/i, resposta: 'Tutorial rápido: 1) Abra Tarefas 2) Clique em + 3) Preencha título e data.' },
    { pattern: /atalho|\/atalhos/i, resposta: 'Atalhos: Enter para enviar. /ajuda para comandos.' },
    { pattern: /contato|\/contato/i, resposta: 'Contato do suporte: suporte@empresa.com' },
    { pattern: /.*/i, resposta: 'Desculpa, não entendi. Tente usar /ajuda para ver comandos.' }
  ];

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.loadConversations();

    // polling para manter sincronia entre abas (pode trocar por SSE/websocket depois)
    this.pollingSub = timer(0, 3000).pipe(
      switchMap(() => this.chatService.listar())
    ).subscribe(list => {
      this.conversations = (list || []).sort((a, b) => {
        // fixados primeiro
        if ((a.fixado ? 1 : 0) !== (b.fixado ? 1 : 0)) return (b.fixado ? 1 : 0) - (a.fixado ? 1 : 0);
        return (b.id || 0) - (a.id || 0);
      });
      this.applyFilter(false);
      this.rebuildPinned();

      // atualizar selected para referência atual para evitar sobrescrita
      if (this.selected) {
        const updated = this.conversations.find(c => c.id === this.selected!.id);
        if (updated) this.selected = updated;
        this.scrollToBottom();
      }
    });
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
  }

  loadConversations() {
    this.chatService.listar().subscribe(list => {
      this.conversations = (list || []).sort((a,b) => (b.fixado?1:0) - (a.fixado?1:0) || (b.id||0)-(a.id||0));
      this.applyFilter(false);
      this.rebuildPinned();

      const last = localStorage.getItem('chat_last_conversation');
      if (last) {
        const id = Number(last);
        const find = this.conversations.find(c => c.id === id);
        if (find) this.selected = find;
      }
    });
  }

  applyFilter(keepSelection = true) {
    const q = this.filter.trim().toLowerCase();
    this.conversationsFiltered = this.conversations.filter(c => !c.fixado && (!q || c.nome.toLowerCase().includes(q)));
    if (!keepSelection && this.conversationsFiltered.length && !this.selected) {
      this.selected = this.conversationsFiltered[0];
    }
  }

  rebuildPinned() {
    this.pinnedConversations = this.conversations.filter(c => c.fixado);
  }

  selectConversation(c: Conversa) {
    this.selected = c;
    localStorage.setItem('chat_last_conversation', String(c.id));
    setTimeout(()=> this.scrollToBottom(), 50);
  }

  createConversation() {
    const novo: Partial<Conversa> = { nome: 'Novo Contato', tipo: 'usuario', fixado: false, icone: 'user', mensagens: [] };
    this.chatService.criar(novo).subscribe(res => {
      this.conversations.push(res);
      this.applyFilter();
      this.selectConversation(res);
    });
  }

  toggleFix(c: Conversa) {
    const novoFixado = !c.fixado;
    this.chatService.atualizarParcial(c.id!, { fixado: novoFixado }).subscribe(() => {
      // atualização será refletida pelo polling; atualizar localmente para resposta imediata:
      const idx = this.conversations.findIndex(x => x.id === c.id);
      if (idx > -1) this.conversations[idx] = { ...this.conversations[idx], fixado: novoFixado };
      this.rebuildPinned();
      this.applyFilter();
    });
  }

  isMe(m: Mensagem) {
    return m.autor === 'Você' || m.autor === 'Me';
  }

  getInitials(name: string) {
    return name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
  }

  getLastSnippet(c: Conversa) {
    if (!c.mensagens || c.mensagens.length === 0) return '';
    const last = c.mensagens[c.mensagens.length - 1];
    return last.texto.length > 30 ? last.texto.slice(0, 30) + '...' : last.texto;
  }

  formatTime(ts?: string) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom() {
    try {
      const el = this.messagesBox?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch(e){}
  }

  sendMessage() {
    const text = this.draft.trim();
    if (!text || !this.selected) return;
    const mensagem: Mensagem = {
      id: Date.now(),
      autor: 'Você',
      texto: text,
      timestamp: new Date().toISOString()
    };

    // atualiza local (optimistic)
    const convId = this.selected.id!;
    const convCopy: Conversa = { ...this.selected, mensagens: [...(this.selected.mensagens || []), mensagem] };
    this.selected.mensagens = convCopy.mensagens;
    this.draft = '';
    this.scrollToBottom();

    // salva no servidor com PUT (somar mensagens)
    this.chatService.buscarPorId(convId).subscribe({
      next: serverConv => {
        const merged = { ...serverConv, mensagens: [...(serverConv.mensagens || []), mensagem] };
        this.chatService.atualizar(convId, merged).subscribe({
          next: () => {
            // se conversa com bot, responde automaticamente
            if (merged.tipo === 'bot') this.handleBotResponse(text, merged);
          },
          error: err => console.error('Erro ao salvar mensagem', err)
        });
      },
      error: err => console.error('Erro ao buscar conversa antes do POST', err)
    });
  }

  handleBotResponse(userText: string, conv: Conversa) {
    this.typing = true;
    const rule = this.botRules.find(r => r.pattern.test(userText));
    const resposta = rule ? rule.resposta : 'Desculpe, não entendi.';
    const delay = 700 + Math.min(userText.length * 30, 1500);

    setTimeout(() => {
      const botMsg: Mensagem = {
        id: Date.now() + 1,
        autor: 'bot',
        texto: resposta,
        timestamp: new Date().toISOString()
      };

      // buscar conversa atual no servidor, append e PUT
      this.chatService.buscarPorId(conv.id!).subscribe({
        next: serverConv => {
          serverConv.mensagens = [...(serverConv.mensagens || []), botMsg];
          this.chatService.atualizar(conv.id!, serverConv).subscribe({
            next: () => {
              this.typing = false;
              const idx = this.conversations.findIndex(x => x.id === conv.id);
              if (idx > -1) this.conversations[idx] = serverConv;
              if (this.selected && this.selected.id === conv.id) {
                this.selected = serverConv;
                setTimeout(()=> this.scrollToBottom(), 80);
              }
            },
            error: err => {
              console.error('Erro ao salvar resposta do bot', err);
              this.typing = false;
            }
          });
        },
        error: err => {
          console.error('Erro ao buscar conversa para resposta do bot', err);
          this.typing = false;
        }
      });
    }, delay);
  }

  /* ------------------- editar contato (modal) ------------------- */
  openEditModal(c: Conversa) {
    this.editModel = { id: c.id, nome: c.nome, icone: c.icone };
    this.editModalOpen = true;
  }

  closeEditModal() {
    this.editModalOpen = false;
    this.editModel = {};
  }

  saveEdit() {
    if (!this.editModel || !this.editModel.id) return;
    const id = this.editModel.id;
    const patch: Partial<Conversa> = {};
    if (this.editModel.nome) patch.nome = this.editModel.nome;
    if (this.editModel.icone) patch.icone = this.editModel.icone;

    this.chatService.atualizarParcial(id, patch).subscribe({
      next: updated => {
        // atualizar local
        const idx = this.conversations.findIndex(x => x.id === id);
        if (idx > -1) this.conversations[idx] = { ...this.conversations[idx], ...updated };
        if (this.selected && this.selected.id === id) this.selected = { ...this.selected, ...updated };
        this.applyFilter();
        this.closeEditModal();
      },
      error: err => console.error('Erro ao editar contato', err)
    });
  }

  /* ------------------- deletar conversa ------------------- */
  deleteConversation(c?: Conversa) {
    if (!c || !c.id) return;
    const ok = confirm(`Excluir conversa "${c.nome}"? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    this.chatService.remover(c.id).subscribe({
      next: () => {
        // remover localmente
        this.conversations = this.conversations.filter(x => x.id !== c.id);
        this.applyFilter();
        this.rebuildPinned();
        if (this.selected && this.selected.id === c.id) {
          this.selected = undefined;
          localStorage.removeItem('chat_last_conversation');
        }
      },
      error: err => console.error('Erro ao deletar conversa', err)
    });
  }

  openMenu() {
    alert('Menu (placeholder)');
  }
}