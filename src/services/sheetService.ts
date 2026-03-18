import Papa from 'papaparse';

const SPEC_URL = 'https://docs.google.com/spreadsheets/d/1yg7mlk3ZEtR0dmYaE1uzbZKfHTW3eJej/gviz/tq?tqx=out:csv&sheet=SPEC';
const RUBBER_URL = 'https://docs.google.com/spreadsheets/d/1yg7mlk3ZEtR0dmYaE1uzbZKfHTW3eJej/gviz/tq?tqx=out:csv&sheet=RUBBER';
const RECIPE_URL = 'https://docs.google.com/spreadsheets/d/1_SqDVFnw1xRDCH4MhiWg5ZxUcE1UmryuJ4q-0I23x2s/export?format=csv&gid=0';

export interface RubberData {
  rubberName: string;
  sapCode: string;
  rawMaterial: string;
}

export interface RecipeItem {
  name: string;
  code: string;
  weight: string;
}

export interface SpecData {
  material: string;
  alternativeText: string;
  longText: string;
  cusionCompound: string;
  treadCompound1: string;
  treadCompound2: string;
}

export async function fetchRubberData(): Promise<RubberData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(RUBBER_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map((row: any) => ({
          rubberName: row['種類類別']?.trim() || '',
          sapCode: row['SAP ON']?.trim() || '',
          rawMaterial: row['SPC']?.trim() || '',
        })).filter((item) => item.rubberName || item.sapCode);
        resolve(data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export async function fetchRecipeData(rubberName: string): Promise<RecipeItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(RECIPE_URL, {
      download: true,
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 4) {
          resolve([]);
          return;
        }

        const materialNames = rows[1];
        const materialCodes = rows[2];
        
        // Find the matching row: Column C (index 2) matches rubberName, and Column A (index 0) is 'V' or 'Ⅴ'
        const targetRow = rows.find(row => {
          const isV = row[0] === 'V' || row[0] === 'Ⅴ' || row[0] === 'v';
          const isMatch = row[2]?.trim().toUpperCase() === rubberName.toUpperCase();
          return isV && isMatch;
        });

        if (!targetRow) {
          resolve([]);
          return;
        }

        const recipeItems: RecipeItem[] = [];
        // Data starts from column F (index 5)
        for (let i = 5; i < targetRow.length; i++) {
          const weight = targetRow[i]?.trim();
          if (weight && weight !== '' && weight !== '0') {
            recipeItems.push({
              name: materialNames[i]?.trim() || 'Unknown',
              code: materialCodes[i]?.trim() || 'Unknown',
              weight: weight
            });
          }
        }

        resolve(recipeItems);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export async function fetchSpecData(): Promise<SpecData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(SPEC_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map((row: any) => ({
          material: row['Material']?.trim() || '',
          alternativeText: row['Alternative Text']?.trim() || '',
          longText: row['Long text']?.trim() || '',
          cusionCompound: row['Cusion Compound']?.trim() || '',
          treadCompound1: row['Tread Compound head 1']?.trim() || '',
          treadCompound2: row['Tread compound haed 2']?.trim() || '',
        })).filter((item) => item.material || item.alternativeText);
        resolve(data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
