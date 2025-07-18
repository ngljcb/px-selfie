import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  // Add any properties or methods needed for the header component here
  title: string = 'Notes Header';

  constructor() {
    // Initialization logic can go here
  }
}
