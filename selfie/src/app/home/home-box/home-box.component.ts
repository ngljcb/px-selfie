import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-box',
  imports: [RouterModule],
  templateUrl: './home-box.component.html',
  styleUrl: './home-box.component.scss',
})
export class HomeBoxComponent {
  @Input() icon!: string;
  @Input() title!: string;
  @Input() description!: string;
  @Input() link!: string;
}