// Categorie di spesa basate sul Bando SI4.0 2025 - Sezione B.3
export const EXPENSE_CATEGORIES = {
  consulting: 'consulting',
  training: 'training', 
  equipment: 'equipment',
  engineering: 'engineering',
  intellectual_property: 'intellectual_property',
  personnel: 'personnel'
} as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  consulting: 'Consulenza',
  training: 'Formazione',
  equipment: 'Attrezzature tecnologiche e programmi informatici',
  engineering: 'Servizi e tecnologie per ingegnerizzazione SW/HW',
  intellectual_property: 'Tutela della proprietà industriale',
  personnel: 'Spese del personale dedicato al progetto'
};

export const EXPENSE_CATEGORY_DESCRIPTIONS: Record<ExpenseCategory, string> = {
  consulting: 'Consulenza erogata da fornitori qualificati su tecnologie 4.0',
  training: 'Formazione specifica su tecnologie 4.0 con attestato di frequenza',
  equipment: 'Investimenti in attrezzature tecnologiche e software necessari al progetto',
  engineering: 'Servizi per ingegnerizzazione di software/hardware del progetto',
  intellectual_property: 'Spese per brevetti, marchi e tutela della proprietà industriale',
  personnel: 'Costi del personale aziendale dedicato esclusivamente al progetto (max 30%)'
};

// Mapping delle vecchie categorie alle nuove per migrazione
export const LEGACY_CATEGORY_MAPPING: Record<string, ExpenseCategory> = {
  services: 'consulting',
  materials: 'equipment',
  equipment: 'equipment',
  personnel: 'personnel',
  travel: 'consulting' // Le spese di viaggio possono essere parte della consulenza
};