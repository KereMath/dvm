import { Routes } from '@angular/router';
import { HelloComponent } from './pages/hello/hello.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { UploadComponent } from './pages/upload/upload.component';
import { AuthGuard } from './guards/auth.guard'; // Guard'ı import ediyoruz

export const routes: Routes = [
  { path: 'hello', component: HelloComponent },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/hello', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  {
    path: 'upload',
    component: UploadComponent,
    canActivate: [AuthGuard], // Bu route için AuthGuard ekliyoruz
  },
];
