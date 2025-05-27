import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ConfigurationModalComponent } from '../configuration-modal/configuration-modal.component';

@Component({
  selector: 'app-documents-modal',
  templateUrl: './documents-modal.component.html',
  styleUrls: ['./documents-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class DocumentsModalComponent implements OnInit {
  documents = [
    {
      title: 'Certificate of Live Birth',
      description:
        'Official record of a child’s birth registered in the municipality.',
      icon: 'document-text-outline',
      type: 'live_birth',
    },
    {
      title: 'Certificate of Death',
      description:
        'Legal document confirming a person’s death as recorded by the civil registrar.',
      icon: 'skull-outline',
      type: 'death',
    },
    {
      title: 'Certificate of Marriage',
      description: 'Legal proof that two individuals are officially married.',
      icon: 'heart-outline',
      type: 'marriage',
    },
    {
      title: 'Certificate of Fetus Death',
      description:
        'Record of fetal death reported to and certified by the local registrar.',
      icon: 'sad-outline',
      type: 'fetus_death',
    },
  ];

  constructor(
    private modalController: ModalController,
    private router: Router,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {}

  // async selectDocument(type: string, title: string) {
  //   // this.router.navigate(['/document-form', type, encodeURIComponent(title)]);
  //   const modal = await this.modalController.create({
  //     component: ConfigurationModalComponent,
  //     cssClass: 'configuration-modal',
  //     componentProps: {
  //       type: type,
  //       title: title,
  //     },
  //   });

  //   await modal.present();
  //   // await this.modalController.dismiss({ type, title });
  // }
  async selectDocument(type: string, title: string): Promise<void> {
    try {
      const modal = await this.modalController.create({
        component: ConfigurationModalComponent,
        cssClass: 'config-modal',
        componentProps: {
          type,
          title,
        },
      });

      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data?.options) {
        await this.modalController.dismiss({ type, title });
        await this.showToast('PDF configuration saved!', 'success');
        // Navigate to document-form after saving
        await this.router.navigate([
          '/document-form',
          type,
          encodeURIComponent(title),
        ]);
      }
    } catch (error: any) {
      console.error('Error opening configuration modal:', error);
      await this.showToast('Failed to open configuration modal', 'danger');
    }
  }

  async cancel() {
    await this.modalController.dismiss();
  }

  /**
   * Displays a toast notification.
   * @param message The message to display.
   * @param color The toast color (primary, success, warning, danger).
   */
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
