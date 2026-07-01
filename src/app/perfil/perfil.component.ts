import { Component, OnInit } from '@angular/core';
import { Usuario, UsuarioService } from './usuario.service';

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  usuario: Usuario | null = null;

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    // Por enquanto carrega o usuário de id 1 (sem login implementado)
    this.usuarioService.buscarPorId(1).subscribe(u => {
      this.usuario = u;
    });
  }
}