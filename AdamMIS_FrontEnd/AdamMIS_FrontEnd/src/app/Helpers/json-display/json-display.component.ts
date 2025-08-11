// json-display.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

interface ParsedField {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  displayValue: string;
  isImportant?: boolean;
}

@Component({
  selector: 'app-json-display',
  template: `
    <div class="json-viewer" [ngClass]="{'old-values': isOldValues, 'new-values': isNewValues}">
      <div class="json-header" *ngIf="showHeader">
        <span class="json-title">
          <i [class]="headerIcon" class="me-2"></i>
          {{ headerTitle }}
        </span>
        <div class="json-actions">
          <button 
            class="btn btn-link btn-sm p-0 me-2" 
            (click)="toggleView()" 
            title="{{ viewMode === 'formatted' ? 'Show raw JSON' : 'Show formatted view' }}">
            <i [class]="viewMode === 'formatted' ? 'fas fa-code' : 'fas fa-eye'"></i>
          </button>
          <button 
            class="btn btn-link btn-sm p-0" 
            (click)="copyToClipboard()" 
            title="Copy to clipboard">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>

      <div class="json-content">
        <!-- Formatted View -->
        <div class="formatted-view" *ngIf="viewMode === 'formatted' && parsedFields.length > 0">
          <div class="field-item" 
               *ngFor="let field of parsedFields" 
               [ngClass]="{'important-field': field.isImportant}">
            <div class="field-header">
              <span class="field-key">{{ field.key | titlecase }}</span>
              <span class="field-type-badge" [ngClass]="'type-' + field.type">
                {{ field.type }}
              </span>
            </div>
            <div class="field-value" [ngClass]="'value-' + field.type">
              <ng-container [ngSwitch]="field.type">
                
                <!-- Date values -->
                <span *ngSwitchCase="'date'" class="date-value">
                  <i class="fas fa-calendar-alt me-1"></i>
                  {{ field.displayValue }}
                </span>
                
                <!-- Boolean values -->
                <span *ngSwitchCase="'boolean'" [ngClass]="field.value ? 'boolean-true' : 'boolean-false'">
                  <i [class]="field.value ? 'fas fa-check-circle' : 'fas fa-times-circle'" class="me-1"></i>
                  {{ field.displayValue }}
                </span>
                
                <!-- Number values -->
                <span *ngSwitchCase="'number'" class="number-value">
                  <i class="fas fa-hashtag me-1"></i>
                  {{ field.displayValue }}
                </span>
                
                <!-- Object/Array values -->
                <div *ngSwitchCase="'object'" class="object-value">
                  <i class="fas fa-braces me-1"></i>
                  <pre>{{ field.displayValue }}</pre>
                </div>
                
                <div *ngSwitchCase="'array'" class="array-value">
                  <i class="fas fa-list me-1"></i>
                  <div class="array-items">
                    <span class="array-item" *ngFor="let item of field.value; let i = index">
                      <span class="item-index">{{ i + 1 }}.</span>
                      {{ item }}
                    </span>
                  </div>
                </div>
                
                <!-- String values (default) -->
                <span *ngSwitchDefault class="string-value">
                  <i class="fas fa-quote-left me-1"></i>
                  {{ field.displayValue }}
                </span>
                
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Raw JSON View -->
        <pre class="raw-json" *ngIf="viewMode === 'raw'">{{ formattedJson }}</pre>
        
        <!-- Empty State -->
        <div class="empty-json" *ngIf="!jsonData">
          <i class="fas fa-info-circle me-2"></i>
          No data available
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./json-display.component.css']
})
export class JsonDisplayComponent implements OnChanges {
  @Input() jsonData: string | null = null;
  @Input() isOldValues: boolean = false;
  @Input() isNewValues: boolean = false;
  @Input() showHeader: boolean = true;
  @Input() headerTitle: string = '';
  @Input() maxHeight: string = '300px';

  parsedFields: ParsedField[] = [];
  formattedJson: string = '';
  viewMode: 'formatted' | 'raw' = 'formatted';

  get headerIcon(): string {
    if (this.isOldValues) return 'fas fa-history';
    if (this.isNewValues) return 'fas fa-edit';
    return 'fas fa-code';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jsonData']) {
      this.parseJsonData();
    }
  }

  private parseJsonData(): void {
    if (!this.jsonData) {
      this.parsedFields = [];
      this.formattedJson = '';
      return;
    }

    try {
      const parsed = JSON.parse(this.jsonData);
      this.formattedJson = JSON.stringify(parsed, null, 2);
      this.parsedFields = this.extractFields(parsed);
    } catch (error) {
      // If it's not valid JSON, treat as string
      this.formattedJson = this.jsonData;
      this.parsedFields = [
        {
          key: 'value',
          value: this.jsonData,
          type: 'string',
          displayValue: this.jsonData
        }
      ];
    }
  }

  private extractFields(obj: any): ParsedField[] {
    const fields: ParsedField[] = [];

    if (typeof obj !== 'object' || obj === null) {
      return [{
        key: 'value',
        value: obj,
        type: this.getFieldType(obj),
        displayValue: this.formatValue(obj)
      }];
    }

    for (const [key, value] of Object.entries(obj)) {
      const field: ParsedField = {
        key: this.formatFieldKey(key),
        value: value,
        type: this.getFieldType(value),
        displayValue: this.formatValue(value),
        isImportant: this.isImportantField(key)
      };
      
      fields.push(field);
    }

    // Sort fields: important fields first, then alphabetically
    return fields.sort((a, b) => {
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return a.key.localeCompare(b.key);
    });
  }

  private getFieldType(value: any): ParsedField['type'] {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string' && this.isDateString(value)) return 'date';
    return 'string';
  }

  private isDateString(value: string): boolean {
    // Check if it's an ISO date string or similar date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
    return dateRegex.test(value) && !isNaN(Date.parse(value));
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'Not specified';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'string' && this.isDateString(value)) {
      return this.formatDate(value);
    }
    
    if (Array.isArray(value)) {
      return `${value.length} item${value.length !== 1 ? 's' : ''}`;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  private formatFieldKey(key: string): string {
    // Convert camelCase to readable format
    return key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
  }

  private isImportantField(key: string): boolean {
    const importantFields = [
      'username', 'userName', 'user',
      'reportfilename', 'reportFileName', 'fileName', 'name',
      'categoryname', 'categoryName', 'category',
      'assignedby', 'assignedBy', 'createdby', 'createdBy',
      'assignedat', 'assignedAt', 'createdat', 'createdAt',
      'status', 'state', 'type'
    ];
    
    return importantFields.includes(key.toLowerCase());
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'formatted' ? 'raw' : 'formatted';
  }

  async copyToClipboard(): Promise<void> {
    try {
      const textToCopy = this.viewMode === 'formatted' 
        ? this.parsedFields.map(field => `${field.key}: ${field.displayValue}`).join('\n')
        : this.formattedJson;
        
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
}