import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { RecordsService } from 'src/app/services/records.service';
import { ViewRecordsModalComponent } from '../../modals/view-records-modal/view-records-modal.component';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { ApiUrlModalComponent } from '../../modals/api-url-modal/api-url-modal.component';
import { LicenseKeyModalComponent } from '../../modals/license-key-modal/license-key-modal.component';
import { environment } from 'src/environments/environment';
import { ScanbotSDK } from 'capacitor-plugin-scanbot-sdk';

interface Document {
  id?: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  document_type: string;
  pdf_url: string;
  front_url?: string;
  processedPdfUrl?: string;
  thumbnailUrl?: string;
}

@Component({
  selector: 'app-records',
  templateUrl: './records.page.html',
  styleUrls: ['./records.page.scss'],
  standalone: false,
})
export class RecordsPage implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  searchText: string = '';
  isLoading: boolean = false;
  isLoadingMore: boolean = false;
  currentPage: number = 1;
  lastPage: number = 1;
  defaultApiUrl = environment.apiUrl;
  defaultLicenseKey = environment.licenseKey;

  static readonly FILE_ENCRYPTION_ENABLED: boolean = false;

  constructor(
    private recordsService: RecordsService,
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private authService: AuthService,
    private scanbotSdk: ScanbotSDK
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.loadDocuments();
    this.isLoading = false;
  }

  private async loadDocuments(): Promise<void> {
    try {
      const response = await this.recordsService.getDocumentsByPage(
        this.currentPage
      );
      let newDocuments = (response.data?.data ?? []) as Document[];

      newDocuments = newDocuments.map((doc) => ({
        ...doc,
        pdf_url: this.sanitizeUrl(doc.pdf_url),
        front_url: doc.front_url ? this.sanitizeUrl(doc.front_url) : undefined,
        thumbnailUrl: this.getFallbackImage(),
      }));

      this.documents = [...this.documents, ...newDocuments];
      this.filteredDocuments = [...this.documents];
      this.lastPage = response.data?.last_page ?? 1;
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      this.documents = [];
      this.filteredDocuments = [];
      await this.showToast('Failed to load documents', 'danger');
    }
  }

  private sanitizeUrl(url: string): string {
    if (!url) return url;
    const localServer = 'https://192.168.100.123';
    if (url.startsWith('localhost/')) {
      return `${localServer}/${url.replace('localhost/', '')}`;
    }
    if (url.startsWith('/storage')) {
      return `${localServer}${url}`;
    }
    return url;
  }

  isPdf(url: string): boolean {
    return url?.toLowerCase().endsWith('.pdf');
  }

  private getFallbackImage(): string {
    return 'https://picsum.photos/1200/800?r=' + Math.random();
  }

  formatText(input: string): string {
    if (!input) return '';
    return input
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getFullName(doc: Document): string {
    const { first_name, middle_name, last_name, suffix } = doc;
    return `${first_name} ${middle_name ?? ''} ${last_name} ${
      suffix ?? ''
    }`.trim();
  }

  async openDocumentModal(doc: Document): Promise<void> {
    const isPdfImage = this.isPdf(doc.pdf_url);
    const modal = await this.modalController.create({
      component: ViewRecordsModalComponent,
      componentProps: {
        document: {
          ...doc,
          full_name: this.formatText(this.getFullName(doc)),
          document_type: this.formatText(doc.document_type),
        },
        isPdfImage,
      },
      cssClass: 'view-records-modal',
    });
    await modal.present();
  }

  filterDocuments(): void {
    const searchTextLower = this.searchText.toLowerCase();
    this.filteredDocuments = this.documents.filter((doc) => {
      const fullName = this.getFullName(doc).toLowerCase();
      const document_type = doc.document_type.toLowerCase();
      return (
        fullName.includes(searchTextLower) ||
        document_type.includes(searchTextLower)
      );
    });
  }

  async loadMoreDocuments(event: any): Promise<void> {
    if (this.isLoadingMore || this.currentPage >= this.lastPage) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      this.currentPage++;
      await this.loadDocuments();
    } catch (error: any) {
      console.error('Failed to load more documents:', error);
      await this.showToast('Failed to load more documents', 'danger');
    } finally {
      this.isLoadingMore = false;
      event.target.complete();
    }
  }

  async presentSettingsModal() {
    const modal = await this.modalController.create({
      component: SettingsModalComponent,
      cssClass: 'settings-modal',
    });

    modal.onDidDismiss().then((result) => {
      const action = result.data?.action;
      if (action === 'setApiUrl') {
        this.presentApiUrlDialog();
      } else if (action === 'setLicenseKey') {
        this.presentLicenseKeyDialog();
      } else if (action === 'logout') {
        this.authService.logout();
      }
    });

    await modal.present();
  }

  async presentApiUrlDialog() {
    const storedUrl = localStorage.getItem('customApiUrl') || '';
    const modal = await this.modalController.create({
      component: ApiUrlModalComponent,
      cssClass: 'api-url-modal',
      componentProps: {
        apiUrl: storedUrl || this.defaultApiUrl,
      },
    });

    modal.onDidDismiss().then((result) => {
      const data = result.data;
      if (data?.apiUrl?.trim()) {
        localStorage.setItem('customApiUrl', data.apiUrl.trim());
        this.showToast('API URL updated successfully.', 'success');
      }
    });

    await modal.present();
  }

  async presentLicenseKeyDialog(): Promise<void> {
    const storedKey = localStorage.getItem('customLicenseKey') || '';
    const modal = await this.modalController.create({
      component: LicenseKeyModalComponent,
      cssClass: 'api-url-modal',
      componentProps: {
        licenseKey: storedKey || this.defaultLicenseKey,
      },
    });

    modal.onDidDismiss().then((result) => {
      const data = result.data;
      if (data?.licenseKey?.trim()) {
        const sanitizedKey = this.sanitizeLicenseKey(data.licenseKey);
        if (this.isValidLicenseKey(sanitizedKey)) {
          localStorage.setItem('customLicenseKey', sanitizedKey);
          this.showToast('License key updated successfully.', 'success');
          // Re-initialize SDK with new key
          this.initializeSdk();
        } else {
          this.showToast('Invalid license key format.', 'danger');
        }
      }
    });

    await modal.present();
  }

  private sanitizeLicenseKey(key: string): string {
    // Minimal sanitization: trim only leading/trailing whitespace
    return key.trim();
  }

  private isValidLicenseKey(key: string): boolean {
    // Basic validation: check length and format
    return key.length >= 400 && /^[\w\+\/=]+\n[\w\+\/=]+$/.test(key);
  }

  async initializeSdk(): Promise<void> {
    try {
      const licenseKey =
        localStorage.getItem('customLicenseKey') || this.defaultLicenseKey;
      const result = await this.scanbotSdk.initializeSDK({
        licenseKey: licenseKey,
        loggingEnabled: !environment.production, // Enable logging in dev mode
        storageImageFormat: 'JPG',
        storageImageQuality: 80,
        documentDetectorMode: 'ML_BASED',
        fileEncryptionMode: RecordsPage.FILE_ENCRYPTION_ENABLED
          ? 'AES256'
          : undefined,
        fileEncryptionPassword: RecordsPage.FILE_ENCRYPTION_ENABLED
          ? 'SomeSecretPa$$w0rdForFileEncryption'
          : undefined,
      });
      if (result.status === 'OK') {
        await this.showToast(
          'Scanbot SDK initialized successfully.',
          'success'
        );
      } else {
        await this.showToast(
          'Failed to initialize Scanbot SDK: Invalid license key.',
          'danger'
        );
      }
    } catch (error: any) {
      console.error('Scanbot SDK initialization failed:', error);
      await this.showToast(`'Failed to initialize scanner: ${error.message}`, 'danger');
    }
  }

  async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
    });
    await toast.present();
  }

  onPdfError(doc: Document, event: any): void {
    console.error(`PDF load error for ${doc.pdf_url}:`, event);
    doc.thumbnailUrl = this.getFallbackImage();
    this.filteredDocuments = [...this.documents];
  }
}
