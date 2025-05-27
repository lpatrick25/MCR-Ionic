import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CreatePDFOptions,
  DocumentData,
  OCRConfiguration,
  PageData,
  ScanbotSDK,
} from 'capacitor-plugin-scanbot-sdk';
import { Capacitor } from '@capacitor/core';
import { NavController } from '@ionic/angular';
import { RecordsService } from 'src/app/services/records.service';
import { CommonUtils } from 'src/app/utils/common-utils';

interface PageDataResult {
  page: PageData;
  pagePreviewWebViewPath: string;
}

interface FormSubmission {
  [key: string]: any;
}

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

@Component({
  selector: 'app-form-result',
  templateUrl: './form-result.page.html',
  styleUrls: ['./form-result.page.scss'],
  standalone: false,
})
export class FormResultPage implements OnInit {
  formSubmission?: FormSubmission;
  document?: DocumentData;
  pageImagePreviews: PageDataResult[] = [];
  loading = false;

  private navController = inject(NavController);
  private utils = inject(CommonUtils);
  private activatedRoute = inject(ActivatedRoute);
  private recordService = inject(RecordsService);
  private router = inject(Router);
  ocrConfiguration: any = {};

  async ngOnInit() {
    this.activatedRoute.paramMap.subscribe(async (params) => {
      const documentID = params.get('documentID');
      if (!documentID) {
        await this.utils.showErrorAlert('Invalid document ID');
        await this.navController.navigateRoot('/record');
        return;
      }

      const navigation = this.router.getCurrentNavigation();
      this.formSubmission = navigation?.extras?.state?.['submission'] as
        | FormSubmission
        | undefined;
      await this.loadDocument(documentID);
    });
  }

  /**
   * Updates the current document and refreshes page previews.
   * @param updatedDocument The updated document data.
   */
  private updateCurrentDocument(updatedDocument: DocumentData): void {
    this.document = updatedDocument;
    this.pageImagePreviews = updatedDocument.pages.map((page) => ({
      page,
      pagePreviewWebViewPath: Capacitor.convertFileSrc(
        (page.documentImagePreviewURI || page.originalImageURI) +
          '?' +
          Date.now()
      ),
    }));
  }

  /**
   * Navigates to the page result page for the selected page.
   * @param page The selected page data.
   */
  async onPageSelect(page: PageData): Promise<void> {
    if (!this.document?.uuid) {
      await this.utils.showErrorAlert('Document UUID is missing');
      return;
    }
    await this.navController.navigateForward([
      '/page-result',
      this.document.uuid,
      page.uuid,
    ]);
  }

  /**
   * Loads a document by ID from ScanbotSDK.
   * @param id The document ID.
   */
  private async loadDocument(id: string): Promise<void> {
    this.loading = true;
    try {
      const documentResult = await ScanbotSDK.Document.loadDocument({
        documentID: id,
      });
      this.updateCurrentDocument(documentResult);
    } catch (error: any) {
      await this.utils.showErrorAlert(
        `Failed to load document: ${error.message}`
      );
    } finally {
      this.loading = false;
    }
  }

  private getSavedPdfConfig(): CreatePDFOptions {
    const defaultOptions: CreatePDFOptions = {
      pageSize: 'LEGAL',
      pageDirection: 'PORTRAIT',
      pageFitMode: 'NONE',
    };

    try {
      const savedConfig = localStorage.getItem('pdfConfig');
      if (!savedConfig) {
        return defaultOptions;
      }

      const parsedConfig: CreatePDFOptions = JSON.parse(savedConfig);

      // Validate options
      const validPageSizes: PageSize[] = [
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
      const validPageDirections: PageDirection[] = [
        'PORTRAIT',
        'LANDSCAPE',
        'AUTO',
      ];
      const validPageFitModes: PDFPageFitMode[] = [
        'FIT_IN',
        'FILL_IN',
        'STRETCH',
        'NONE',
      ];

      const validatedConfig: CreatePDFOptions = {
        pageSize: validPageSizes.includes(parsedConfig.pageSize as PageSize)
          ? parsedConfig.pageSize
          : defaultOptions.pageSize,
        pageDirection: validPageDirections.includes(
          parsedConfig.pageDirection as PageDirection
        )
          ? parsedConfig.pageDirection
          : defaultOptions.pageDirection,
        pageFitMode: validPageFitModes.includes(
          parsedConfig.pageFitMode as PDFPageFitMode
        )
          ? parsedConfig.pageFitMode
          : defaultOptions.pageFitMode,
      };

      return validatedConfig;
    } catch (error: any) {
      console.error(
        'Failed to retrieve PDF configuration from local storage:',
        error
      );
      return defaultOptions;
    }
  }

  /**
   * Exports the document as PDF and PDF and submits it.
   */
  async onExport(): Promise<void> {
    if (!this.document?.uuid) {
      await this.utils.showErrorAlert('Document UUID is missing');
      return;
    }

    this.loading = true;

    try {
      const documentResult = await ScanbotSDK.Document.loadDocument({
        documentID: this.document.uuid,
      });

      const pageCount = documentResult.pages.length;

      if (pageCount < 2) {
        await this.utils.showErrorAlert(
          'Document must have at least two pages (front and back)'
        );
        return;
      }

      if (pageCount > 2) {
        await this.utils.showErrorAlert(
          'Document has more than two pages. Please provide only front and back'
        );
        return;
      }

      const ocrConfiguration: OCRConfiguration = {
        engineMode: 'SCANBOT_OCR',
      };

      // Generate PDF
      const savedOptions = this.getSavedPdfConfig();
      const pdfResult = await ScanbotSDK.Document.createPDF({
        documentID: this.document.uuid,
        options: {
          ...savedOptions,
          ocrConfiguration: this.ocrConfiguration,
        },
      });

      if (pdfResult.status !== 'OK' || !pdfResult.pdfFileUri) {
        throw new Error('PDF generation failed');
      }

      // Get the first page's image URI
      const firstPage = documentResult.pages[0];
      const firstPageImageUri =
        firstPage.documentImageURI || firstPage.originalImageURI;

      if (!firstPageImageUri) {
        throw new Error('First page image URI is missing');
      }

      // Submit document with PDF and first page image
      await this.recordService.submitDocument(
        this.formSubmission,
        pdfResult.pdfFileUri,
        firstPageImageUri // Pass the first page image URI
      );

      await this.utils.showInfoAlert(
        'Document and first page image uploaded successfully!'
      );
      await this.navController.navigateRoot('/home');
    } catch (error: any) {
      console.error('Export error:', error);
      await this.utils.showErrorAlert(
        `Failed to export document: ${error.message}`
      );
    } finally {
      this.loading = false;
    }
  }
}
