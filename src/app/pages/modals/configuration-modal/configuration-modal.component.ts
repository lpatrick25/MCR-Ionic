import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export type PageSize =
  | 'LETTER'
  | 'LEGAL'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'B4'
  | 'B5'
  | 'EXECUTIVE'
  | 'US4x6'
  | 'US4x8'
  | 'US5x7'
  | 'COMM10'
  | 'CUSTOM';

export type PageDirection = 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';

export type PDFPageFitMode = 'FIT_IN' | 'FILL_IN' | 'STRETCH' | 'NONE';

export interface CreatePDFOptions {
  pageSize?: PageSize;
  pageDirection?: PageDirection;
  pageFitMode?: PDFPageFitMode;
  metadata?: any;
  dpi?: number;
  jpegQuality?: number;
  resample?: boolean;
  ocrConfiguration?: any;
}

@Component({
  selector: 'app-configuration-modal',
  templateUrl: './configuration-modal.component.html',
  styleUrls: ['./configuration-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class ConfigurationModalComponent implements OnInit {
  @Input() type: string = '';
  @Input() title: string = '';

  configForm: FormGroup;
  loading: boolean = false;
  pageSizes: PageSize[] = [
    'LETTER',
    'LEGAL',
    'A3',
    'A4',
    'A5',
    'B4',
    'B5',
    'EXECUTIVE',
    'US4x6',
    'US4x8',
    'US5x7',
    'COMM10',
    'CUSTOM',
  ];
  pageDirections: PageDirection[] = ['PORTRAIT', 'LANDSCAPE', 'AUTO'];
  pageFitModes: PDFPageFitMode[] = ['FIT_IN', 'FILL_IN', 'STRETCH', 'NONE'];

  constructor(private modalCtrl: ModalController, private fb: FormBuilder) {
    this.configForm = this.fb.group({
      pageSize: ['LEGAL', Validators.required],
      pageDirection: ['PORTRAIT', Validators.required],
      pageFitMode: ['NONE', Validators.required],
    });
  }

  /**
   * Initializes the component.
   */
  ngOnInit(): void {}

  /**
   * Saves the selected configuration to local storage and dismisses the modal.
   */
  async save(): Promise<void> {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const options: CreatePDFOptions = {
        pageSize: this.configForm.get('pageSize')?.value,
        pageDirection: this.configForm.get('pageDirection')?.value,
        pageFitMode: this.configForm.get('pageFitMode')?.value,
      };

      // Save to local storage
      try {
        localStorage.setItem('pdfConfig', JSON.stringify(options));
      } catch (error: any) {
        console.error(
          'Failed to save PDF configuration to local storage:',
          error
        );
      }

      await this.modalCtrl.dismiss({ options });
    } catch (error: any) {
      console.error('Error saving configuration:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cancels the configuration and dismisses the modal.
   */
  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
