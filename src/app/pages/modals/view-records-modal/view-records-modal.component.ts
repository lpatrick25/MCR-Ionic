import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
  selector: 'app-view-records-modal',
  templateUrl: './view-records-modal.component.html',
  styleUrls: ['./view-records-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, PdfViewerModule],
})
export class ViewRecordsModalComponent implements OnInit {
  @Input() document: any;
  @Input() isPdfImage: boolean = false;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    if (!this.document.front_url) {
      console.warn('Front document URL missing');
      this.document.front_url = this.getFallbackImage();
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  onPdfError() {
    console.error(
      'Failed to load front document PDF:',
      this.document.front_url
    );
    this.document.front_url = this.getFallbackImage();
  }

  getFallbackImage(): string {
    return 'https://picsum.photos/1200/800?r=' + Math.random();
  }
}
