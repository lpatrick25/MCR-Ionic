import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FormMarriagePageRoutingModule } from './form-marriage-routing.module';

import { FormMarriagePage } from './form-marriage.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormMarriagePageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [FormMarriagePage]
})
export class FormMarriagePageModule {}
