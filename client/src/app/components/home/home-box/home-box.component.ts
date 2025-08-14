import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-box',
  imports: [RouterModule, CommonModule],
  templateUrl: './home-box.component.html',
  styleUrl: './home-box.component.scss',
})
export class HomeBoxComponent {
  @Input() icon!: string;
  @Input() title!: string;
  @Input() description!: string;
  @Input() link!: string;
  @Input() iconClass!: string;
}