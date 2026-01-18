import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-poster-controls',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSliderModule
  ],
  templateUrl: './poster-controls.html',
  styleUrl: './poster-controls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosterControlsComponent {
  private fb = inject(FormBuilder);
  private themeService = inject(ThemeService);

  generate = output<{ city: string; country: string; distance: number; theme: string }>();

  themes = this.themeService.getAvailableThemes();

  form = this.fb.group({
    city: ['Paris', Validators.required],
    country: ['France', Validators.required],
    distance: [10000, [Validators.required, Validators.min(1000), Validators.max(100000)]],
    theme: ['midnight_blue', Validators.required]
  });

  customTheme: any = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          this.customTheme = JSON.parse(e.target?.result as string);
          this.themes.push('custom');
          this.form.patchValue({ theme: 'custom' });
        } catch (err) {
          console.error('Invalid JSON theme', err);
        }
      };
      reader.readAsText(file);
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const val = this.form.value;
      const theme = val.theme === 'custom' ? this.customTheme : val.theme;
      this.generate.emit({
        city: val.city!,
        country: val.country!,
        distance: val.distance!,
        theme: theme
      });
    }
  }
}
