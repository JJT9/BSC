
import React, { useState, useCallback } from 'react';
import { AllPerspectivesData, PerspectiveKey } from './types';
import { PERSPECTIVES } from './constants';
import { generatePythonCode } from './services/geminiService';
import PerspectiveTabs from './components/PerspectiveTabs';
import PerspectiveForm from './components/PerspectiveForm';
import CodeDisplay from './components/CodeDisplay';
import { LoadingSpinner, SparklesIcon } from './components/icons';

const initialPerspectiveData = {
  objectives: '',
  metrics: '',
  targets: '',
  initiatives: '',
};

const initialState: AllPerspectivesData = {
  [PerspectiveKey.FINANCIAL]: { ...initialPerspectiveData },
  [PerspectiveKey.CUSTOMER]: { ...initialPerspectiveData },
  [PerspectiveKey.INTERNAL_PROCESS]: { ...initialPerspectiveData },
  [PerspectiveKey.LEARNING_GROWTH]: { ...initialPerspectiveData },
};

export default function App() {
  const [perspectivesData, setPerspectivesData] = useState<AllPerspectivesData>(initialState);
  const [activeTab, setActiveTab] = useState<PerspectiveKey>(PerspectiveKey.FINANCIAL);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleDataChange = useCallback((perspective: PerspectiveKey, field: keyof AllPerspectivesData[PerspectiveKey], value: string) => {
    setPerspectivesData(prevData => ({
      ...prevData,
      [perspective]: {
        ...prevData[perspective],
        [field]: value,
      },
    }));
  }, []);

  const handleGenerateCode = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedCode('');
    try {
      const code = await generatePythonCode(perspectivesData);
      setGeneratedCode(code);
    } catch (e) {
      setError('Ocurrió un error al generar el código. Por favor, inténtelo de nuevo.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const activePerspectiveDetails = PERSPECTIVES.find(p => p.key === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-brand-dark shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Generador de Balanced Scorecard en Python
          </h1>
          <p className="text-brand-light mt-1">
            Define las 4 perspectivas para tu PYME y genera un script de Python para gestionarlas.
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <PerspectiveTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="p-6 md:p-8">
            {activePerspectiveDetails && (
              <PerspectiveForm
                perspective={activePerspectiveDetails}
                data={perspectivesData[activeTab]}
                onChange={handleDataChange}
              />
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleGenerateCode}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full max-w-md bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Generando código...
              </>
            ) : (
              <>
                <SparklesIcon />
                Generar Código Python
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            {error}
          </div>
        )}

        {generatedCode && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">Código Python Generado</h2>
            <CodeDisplay code={generatedCode} />
          </div>
        )}
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>Potenciado por Google Gemini</p>
      </footer>
    </div>
  );
}
