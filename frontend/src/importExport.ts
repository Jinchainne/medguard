// MedGuard Import/Export Utilities

export type PatientImport = {
  patient_id: string;
  full_name: string;
  allergies?: string;
  conditions?: string;
  blood_type?: string;
  age_years?: number;
  weight_kg?: number;
};

export type DrugImport = {
  drug_name: string;
  category?: string;
  common_dosages?: string;
  side_effects?: string;
  contraindications?: string;
};

// Parse CSV string to array of objects
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

// Parse JSON string or array
export function parseJSON(text: string): any[] {
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [data];
  } catch {
    return [];
  }
}

// Auto-detect format and parse
export function parseImportData(text: string, filename: string): any[] {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'json') return parseJSON(text);
  if (ext === 'csv' || ext === 'txt') return parseCSV(text);
  // Try JSON first, then CSV
  try { return parseJSON(text); } catch { return parseCSV(text); }
}

// Map raw data to PatientImport
export function mapToPatients(data: any[]): PatientImport[] {
  return data.map(row => ({
    patient_id: row.patient_id || row.id || row.ID || row.patientId || '',
    full_name: row.full_name || row.name || row.Name || row.fullName || row.patient_name || '',
    allergies: row.allergies || row.Allergies || '',
    conditions: row.conditions || row.Conditions || row.medical_conditions || '',
    blood_type: row.blood_type || row.bloodType || row.blood || row.Blood_Type || '',
    age_years: parseInt(row.age_years || row.age || row.Age || '0') || 0,
    weight_kg: parseFloat(row.weight_kg || row.weight || row.Weight || '0') || 0,
  })).filter(p => p.patient_id && p.full_name);
}

// Map raw data to DrugImport
export function mapToDrugs(data: any[]): DrugImport[] {
  return data.map(row => ({
    drug_name: row.drug_name || row.name || row.Name || row.drugName || row.Drug_Name || '',
    category: row.category || row.Category || row.type || '',
    common_dosages: row.common_dosages || row.dosages || row.Dosages || '',
    side_effects: row.side_effects || row.sideEffects || row.Side_Effects || '',
    contraindications: row.contraindications || row.Contraindications || row.contra || '',
  })).filter(d => d.drug_name);
}

// Export array to CSV string
export function toCSV(data: any[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const val = String(row[col] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n') 
        ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

// Download file
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Read file as text
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
