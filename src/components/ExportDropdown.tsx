import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileText, FileDown } from 'lucide-react';

interface ExportDropdownProps {
  onExport: (format: 'json' | 'csv' | 'excel' | 'pdf') => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

export function ExportDropdown({ 
  onExport, 
  disabled = false,
  size = 'sm',
  variant = 'outline'
}: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onExport('pdf')} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2 text-red-500" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('excel')} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('csv')} className="cursor-pointer">
          <FileDown className="h-4 w-4 mr-2 text-blue-500" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('json')} className="cursor-pointer">
          <FileJson className="h-4 w-4 mr-2 text-amber-500" />
          JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
