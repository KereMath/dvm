import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule], // Test sırasında yönlendirmeleri kontrol etmek için RouterTestingModule kullanıyoruz
      providers: [AuthGuard],
    });
    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);

    // spyOn kullanarak router.navigate fonksiyonunu gözlemleyebiliriz
    spyOn(router, 'navigate').and.stub();
  });

  it('should allow activation if token exists', () => {
    // Token localStorage'a eklenmiş durumda
    localStorage.setItem('token', 'dummy-token');
    
    // canActivate true döndürmeli
    expect(guard.canActivate()).toBe(true);
  });

  it('should deny activation and navigate to /hello if no token', () => {
    // Token yok
    localStorage.removeItem('token');

    // canActivate false döndürmeli
    expect(guard.canActivate()).toBe(false);

    // Ayrıca kullanıcı /hello rotasına yönlendirilmiş olmalı
    expect(router.navigate).toHaveBeenCalledWith(['/hello']);
  });
});
