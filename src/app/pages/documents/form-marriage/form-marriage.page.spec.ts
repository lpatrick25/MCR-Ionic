import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormMarriagePage } from './form-marriage.page';

describe('FormMarriagePage', () => {
  let component: FormMarriagePage;
  let fixture: ComponentFixture<FormMarriagePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FormMarriagePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
