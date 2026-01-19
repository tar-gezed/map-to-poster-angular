import { Component, input, output, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme, ThemeService } from '../../services/theme.service';
import { ThemePreviewSvgComponent } from '../theme-preview-svg/theme-preview-svg.component';

@Component({
    selector: 'app-sidebar-style-selector',
    standalone: true,
    imports: [CommonModule, ThemePreviewSvgComponent],
    templateUrl: './sidebar-style-selector.component.html',
    styleUrl: './sidebar-style-selector.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarStyleSelectorComponent {
    private themeService = inject(ThemeService);

    themes = input<string[]>([]);
    currentTheme = input<string>('');
    themeSelected = output<string>();

    themeData = signal<Record<string, Theme>>({});

    constructor() {
        effect(() => {
            const themeNames = this.themes();
            if (themeNames.length > 0) {
                this.loadThemes(themeNames);
            }
        });
    }

    loadThemes(names: string[]) {
        names.forEach(name => {
            if (this.themeData()[name]) return;

            this.themeService.loadTheme(name).subscribe(theme => {
                this.themeData.update(current => ({ ...current, [name]: theme }));
            });
        });
    }

    selectTheme(theme: string) {
        this.themeSelected.emit(theme);
    }
}
