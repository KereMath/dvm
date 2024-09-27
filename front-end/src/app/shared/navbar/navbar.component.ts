import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true, // Make sure this is true
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [/* Add any required Angular modules here like RouterModule */]
})
export class NavbarComponent { }
