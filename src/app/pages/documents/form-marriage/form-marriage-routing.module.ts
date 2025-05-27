import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FormMarriagePage } from './form-marriage.page';

const routes: Routes = [
  {
    path: '',
    component: FormMarriagePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FormMarriagePageRoutingModule {}
