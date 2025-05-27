import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ModalController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  ScanbotSDK,
  ScanbotSdkConfiguration,
} from 'capacitor-plugin-scanbot-sdk';
import {
  DocumentScanningFlow,
  startDocumentScanner,
} from 'capacitor-plugin-scanbot-sdk/ui_v2';
import { AuthService } from 'src/app/services/auth.service';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal.component';
import { LicenseKeyModalComponent } from '../../modals/license-key-modal/license-key-modal.component';
import { ApiUrlModalComponent } from '../../modals/api-url-modal/api-url-modal.component';
import { environment } from 'src/environments/environment';

interface DocumentSubmission {
  documentType: string;
  documentTitle: string;
  husband: {
    firstName: string;
    husbandMiddleName: string;
    husbandLastName: string;
    husbandSuffix: string;
    husbandDob: string;
    husbandPlaceOfBirth: string;
    husbandFatherName?: string;
    husbandMotherName?: string;
  };
  wife: {
    firstName: string;
    wifeMiddleName: string;
    wifeLastName: string;
    wifeSuffix: string;
    wifeDob: string;
    wifePlaceOfBirth: string;
    wifeFatherName?: string;
    wifeMotherName?: string;
  };
  registryNumber: string;
  documentUuid: string;
}

@Component({
  selector: 'app-form-marriage',
  templateUrl: './form-marriage.page.html',
  styleUrls: ['./form-marriage.page.scss'],
  standalone: false,
})
export class FormMarriagePage implements OnInit {
  form: FormGroup;
  documentType: string = '';
  documentTitle: string = '';
  loading: boolean = false;
  formSubmitted: boolean = false;
  hasSubmitted: boolean = false;
  defaultApiUrl = environment.apiUrl;
  defaultLicenseKey = environment.licenseKey;

  static readonly FILE_ENCRYPTION_ENABLED: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      husband: this.fb.group({
        firstName: ['', Validators.required],
        husbandMiddleName: [''],
        husbandLastName: ['', Validators.required],
        husbandSuffix: [''],
        husbandDob: ['', Validators.required],
        husbandPlaceOfBirth: ['', Validators.required],
        husbandFatherName: [''],
        husbandMotherName: [''],
      }),
      wife: this.fb.group({
        firstName: ['', Validators.required],
        wifeMiddleName: [''],
        wifeLastName: ['', Validators.required],
        wifeSuffix: [''],
        wifeDob: ['', Validators.required],
        wifePlaceOfBirth: ['', Validators.required],
        wifeFatherName: [''],
        wifeMotherName: [''],
      }),
      registryNumber: [
        '',
        [Validators.required, Validators.pattern('^\\d{4}-\\d{3}$')],
      ],
    });
  }

  async ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.documentType = params.get('type') || '';
      this.documentTitle = decodeURIComponent(params.get('title') || '');
    });
    await this.initScanbotSdk();
  }

  async submitForm(): Promise<void> {
    this.formSubmitted = true;
    if (this.form.invalid) {
      await this.showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (this.hasSubmitted) {
      await this.showToast('Form already submitted.', 'warning');
      return;
    }

    this.loading = true;
    try {
      const configuration = new DocumentScanningFlow();
      configuration.outputSettings.pagesScanLimit = 0;
      configuration.screens.camera.cameraConfiguration.autoSnappingEnabled =
        true;
      configuration.screens.camera.bottomBar.autoSnappingModeButton.visible =
        true;
      configuration.screens.camera.bottomBar.manualSnappingModeButton.visible =
        true;
      configuration.palette.sbColorPrimary = '#800000';
      configuration.palette.sbColorOnPrimary = '#ffffff';
      configuration.screens.camera.userGuidance.statesTitles.tooDark =
        'Need more lighting to detect a document';
      configuration.screens.camera.userGuidance.statesTitles.tooSmall =
        'Document too small';
      configuration.screens.camera.userGuidance.statesTitles.noDocumentFound =
        'Could not detect a document';
      configuration.screens.review.enabled = true;
      configuration.screens.review.bottomBar.addButton.visible = true;
      configuration.screens.review.bottomBar.retakeButton.visible = true;
      configuration.screens.review.bottomBar.cropButton.visible = true;
      configuration.screens.review.bottomBar.rotateButton.visible = true;
      configuration.screens.review.bottomBar.deleteButton.visible = true;
      configuration.screens.review.morePopup.reorderPages.icon.visible = true;
      configuration.screens.review.morePopup.deleteAll.icon.visible = true;
      configuration.screens.review.morePopup.deleteAll.title.text =
        'Delete all pages';
      configuration.screens.reorderPages.topBarTitle.text = 'Reorder Pages';
      configuration.screens.reorderPages.guidance.title.text = 'Reorder Pages';
      configuration.screens.cropping.topBarTitle.text = 'Cropping Screen';
      configuration.screens.cropping.bottomBar.resetButton.visible = true;
      configuration.screens.cropping.bottomBar.rotateButton.visible = true;
      configuration.screens.cropping.bottomBar.detectButton.visible = true;

      const documentResult = await startDocumentScanner(configuration);
      if (documentResult.status !== 'OK') {
        throw new Error('Document scanning failed or was cancelled.');
      }

      const submission: DocumentSubmission = {
        documentType: this.documentType,
        documentTitle: this.documentTitle,
        husband: this.form.get('husband')?.value,
        wife: this.form.get('wife')?.value,
        registryNumber: this.form.get('registryNumber')?.value,
        documentUuid: documentResult.uuid,
      };

      this.hasSubmitted = true;
      await this.router.navigate(['/form-result', documentResult.uuid], {
        state: { submission },
      });
    } catch (error: any) {
      console.error('Form submission error:', error);
      await this.showToast(
        `Failed to submit document: ${error.message || 'Unknown error'}`,
        'danger'
      );
    } finally {
      this.loading = false;
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
        } else {
          this.showToast('Invalid license key format.', 'danger');
        }
      }
    });

    await modal.present();
  }

  sanitizeLicenseKey(input: string): string {
    return input.trim().replace(/\s+/g, '');
  }

  isValidLicenseKey(key: string): boolean {
    return typeof key === 'string' && key.length > 400;
  }

  private async initScanbotSdk(): Promise<void> {
    const config: ScanbotSdkConfiguration = {
      licenseKey: this.defaultLicenseKey,
      loggingEnabled: true,
      storageImageFormat: 'JPG',
      storageImageQuality: 80,
      documentDetectorMode: 'ML_BASED',
      fileEncryptionMode: FormMarriagePage.FILE_ENCRYPTION_ENABLED
        ? 'AES256'
        : undefined,
      fileEncryptionPassword: FormMarriagePage.FILE_ENCRYPTION_ENABLED
        ? 'SomeSecretPa$$w0rdForFileEncryption'
        : undefined,
    };

    try {
      const result = await ScanbotSDK.initializeSDK(config);
      console.log('Scanbot SDK initialized:', result);
    } catch (error: any) {
      console.error('Scanbot SDK initialization failed:', error);
      await this.showToast('Failed to initialize scanner', 'danger');
    }
  }

  cancel(): void {
    this.navCtrl.navigateBack('/home');
  }

  private async showToast(
    message: string,
    color: string = 'primary'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
    });
    await toast.present();
  }
}
