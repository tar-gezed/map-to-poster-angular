import { Component, Injectable, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Toast {
    id: number;
    message: string;
    type: 'info' | 'error' | 'success';
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);

    show(message: string, type: 'info' | 'error' | 'success' = 'info') {
        const id = Date.now();
        this.toasts.update(current => [...current, { id, message, type }]);
        setTimeout(() => this.remove(id), 3000);
    }

    remove(id: number) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="toast.type">
          <span>{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 9999;
      pointer-events: none;
    }

    .toast {
      background: rgba(30, 30, 30, 0.95);
      backdrop-filter: blur(10px);
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 14px;
      animation: slideUp 0.3s ease-out;
      display: flex;
      align-items: center;

      &.error {
        border-left: 4px solid #cf6679;
      }
      &.success {
        border-left: 4px solid #03dac6;
      }
      &.info {
        border-left: 4px solid #6200ee;
      }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToastContainerComponent {
    private toastService = inject(ToastService);
    toasts = this.toastService.toasts;
}
