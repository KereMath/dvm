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
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { SuperadminPanelComponent } from './pages/superadmin-panel/superadmin-panel.component';
import { SuperadminUsersComponent } from './pages/superadmin-users/superadmin-users.component';
import { SuperadminDocumentsComponent } from './pages/superadmin-documents/superadmin-documents.component';
import { SuperadminPermissionsComponent } from './pages/superadmin-permissions/superadmin-permissions.component';
import { SuperadminDatasourcesComponent } from './pages/superadmin-datasources/superadmin-datasources.component';
import { SuperadminLogsComponent } from './pages/superadmin-logs/superadmin-logs.component';
import { SuperadminAnalyticsComponent } from './pages/superadmin-analytics/superadmin-analytics.component';
import { SuperadminGuard } from './guards/superadmin.guard'; // SuperadminGuard

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
  { path: 'admin-panel', component: AdminPanelComponent },
  { path: 'superadmin-panel', component: SuperadminPanelComponent, canActivate: [SuperadminGuard] },
  { path: 'kullanicilar-superadmin', component: SuperadminUsersComponent, canActivate: [SuperadminGuard] },
  { path: 'dokumanlar-superadmin', component: SuperadminDocumentsComponent, canActivate: [SuperadminGuard] },
  { path: 'izinler-superadmin', component: SuperadminPermissionsComponent, canActivate: [SuperadminGuard] },
  { path: 'veri-kaynaklari-superadmin', component: SuperadminDatasourcesComponent, canActivate: [SuperadminGuard] },
  { path: 'loglar-superadmin', component: SuperadminLogsComponent, canActivate: [SuperadminGuard] },
  { path: 'veri-analizi-superadmin', component: SuperadminAnalyticsComponent, canActivate: [SuperadminGuard] },

];

