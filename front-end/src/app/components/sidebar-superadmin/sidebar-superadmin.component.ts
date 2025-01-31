import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar-superadmin',
  standalone: true,
  templateUrl: './sidebar-superadmin.component.html',
  styleUrls: ['./sidebar-superadmin.component.css'],
  imports: [CommonModule, RouterModule], // RouterModule eklendi!

})
export class SidebarSuperadminComponent {
  menuItems = [
    { title: 'Kullanıcılar', route: '/kullanicilar-superadmin' },
    { title: 'Loglar', route: '/loglar-superadmin' },
    { title: 'Dökümanlar', route: '/dokumanlar-superadmin' },
    { title: 'İzinler', route: '/izinler-superadmin' },
    { title: 'Veri Kaynakları', route: '/veri-kaynaklari-superadmin' },
    { title: 'Veri Analizi', route: '/veri-analizi-superadmin' },
  ];
}
