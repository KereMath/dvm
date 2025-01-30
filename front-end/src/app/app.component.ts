import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component'; // Import NavbarComponent
import { FooterComponent } from './shared/footer/footer.component'; // Import NavbarComponent
import { ChatbotComponent } from './chatbot/chatbot.component'; // Chatbot bileşenini import edin


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,NavbarComponent,FooterComponent,ChatbotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend-project';
}
