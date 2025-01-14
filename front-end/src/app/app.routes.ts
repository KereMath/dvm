import { Routes } from '@angular/router';
import { HelloComponent } from './pages/hello/hello.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { UploadComponent } from './pages/upload/upload.component';
import { AuthGuard } from './guards/auth.guard'; // AuthGuard
import { MyDocumentsComponent } from './pages/mydocuments/mydocuments.component';
import { SingleDocumentComponent } from './pages/single-document/single-document.component';
import { StatisticianComponent } from './pages/statistician/statistician.component';
import { RedirectGuard } from './guards/redirect.guard'; // RedirectGuard

export const routes: Routes = [
  {
    path: 'hello',
    component: HelloComponent,
    canActivate: [RedirectGuard], // Giriş durumuna göre yönlendirme yapılır
  },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/hello', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  {
    path: 'upload',
    component: UploadComponent,
    canActivate: [AuthGuard], // Bu route için AuthGuard ekliyoruz
  },
  {
    path: 'mydocuments',
    component: MyDocumentsComponent,
    canActivate: [AuthGuard], // Bu route için AuthGuard ekliyoruz
  },
  {
    path: 'singleDoc/:docID',
    component: SingleDocumentComponent,
    canActivate: [AuthGuard], // Bu route için AuthGuard ekliyoruz
  },
  {
    path: 'statistician',
    component: StatisticianComponent,
    canActivate: [AuthGuard], // Bu route için AuthGuard ekliyoruz
  },
];

